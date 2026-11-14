#!/usr/bin/env bash
# Prepara el entorno local de pruebas de punta a punta, comprobando cada paso: es lo mismo que las
# secciones 6 y 9 de la guía, en un solo comando. Hace solo lo que falta, así que se puede repetir
# cuando se quiera (por ejemplo, si un paso se cortó): lo que ya está listo se salta.
#
#   bash pruebas/preparar-entorno.sh              # desde la raíz del repositorio, en Git Bash
#   bash pruebas/preparar-entorno.sh --sembrar    # además vuelve a sembrar los datos desde cero
#
# La primera vez tarda alrededor de una hora (la copia del código y la instalación de PHPUnit son lo
# largo); las siguientes, unos segundos. Al final deja Moodle en http://localhost:8000 y corre la
# prueba de humo.
set -uo pipefail

# Git Bash convierte por su cuenta las rutas que empiezan con / en rutas de Windows (/var/www/moodle
# pasaría a C:/Program Files/Git/var/www/moodle), y esas rutas son del contenedor. En Linux no hace nada.
export MSYS_NO_PATHCONV=1

resembrar=no
[ "${1:-}" = --sembrar ] && resembrar=si

paso() { printf '\n\033[1m== %s\033[0m\n' "$1"; }
listo() { printf '   \033[32m✔\033[0m %s\n' "$1"; }
fallo() {
  printf '\n   \033[31m✘ %s\033[0m\n' "$1" >&2
  shift
  for linea in "$@"; do printf '     %s\n' "$linea" >&2; done
  exit 1
}

# --- 0. Dónde y con qué se corre ---------------------------------------------------------------------
paso "Comprobaciones previas"
if ! command -v docker > /dev/null 2>&1; then
  if grep -qi microsoft /proc/version 2>/dev/null; then
    fallo "Esta terminal es WSL, y ahí no hay Docker." \
      "Abra Git Bash (menú Inicio > Git Bash) y corra el script desde ahí."
  fi
  fallo "No se encuentra el comando docker." "Instale Docker Desktop y ábralo (guía, Requisitos)."
fi
docker info > /dev/null 2>&1 \
  || fallo "Docker no responde." "Abra Docker Desktop y espere a que diga «Engine running»."
listo "Docker responde"

raiz=$(git rev-parse --show-toplevel 2>/dev/null) \
  || fallo "No está dentro del repositorio." "Entre a la carpeta donde clonó el repositorio (guía, sección 1)."
cd "$raiz"
listo "Repositorio: $raiz"

if docker ps --format '{{.Names}}' | grep -q '^ci-.*-php$'; then
  fallo "Jenkins está corriendo un build." \
    "Con 8 GB de memoria no caben los dos a la vez. Espere a que termine y vuelva a correr el script."
fi
if docker ps --filter name=moodle-despliegue-web-1 --format '{{.Ports}}' | grep -q ':8000->'; then
  fallo "El Moodle que despliega Jenkins ocupa el puerto 8000." \
    "Deténgalo con: docker compose -f pruebas/docker/compose.despliegue.yml stop web cron" \
    "o cambie el puerto del despliegue (PUERTO en pruebas/jenkins/.env)."
fi
listo "El puerto 8000 y la memoria están libres para el entorno local"

compose() { docker compose --progress quiet -f pruebas/docker/compose.yml "$@"; }
en_moodle() { compose run --rm -T moodle "$@"; }

# --- 1. Configuración e imagen -----------------------------------------------------------------------
paso "Configuración e imagen"
if [ ! -f config.php ]; then
  cp pruebas/docker/config.php config.php
  listo "config.php copiado de pruebas/docker/config.php"
else
  listo "config.php ya existe"
fi
compose build --quiet > /dev/null || fallo "No se pudo construir la imagen." "Revise la salida de: docker compose build (desde pruebas/docker)."
listo "Imagen moodle-pruebas/php:8.4 lista"
compose up -d --wait db > /dev/null 2>&1 || fallo "La base de datos no arrancó." "Revise: docker compose logs db (desde pruebas/docker)."
listo "PostgreSQL arriba"

# --- 2. Código en el volumen -------------------------------------------------------------------------
paso "Código de Moodle en el volumen"
esperados=$(git ls-files | wc -l)
en_volumen=$(en_moodle sh -c 'find /var/www/moodle -path /var/www/moodle/vendor -prune -o -type f -print | wc -l' 2>/dev/null | tail -1)
en_volumen=${en_volumen//[^0-9]/}
en_volumen=${en_volumen:-0}
if [ "$en_volumen" -lt $((esperados * 95 / 100)) ] || ! en_moodle test -f public/lib/phpunit/bootstraplib.php > /dev/null 2>&1; then
  echo "   El volumen tiene $en_volumen archivos de unos $esperados: se copia el código (unos 25 minutos)."
  bash pruebas/docker/copiar-codigo.sh || fallo "La copia del código no terminó." "Vuelva a correr el script: la copia se repite entera."
  listo "Código copiado"
else
  listo "El volumen ya tiene el código ($en_volumen archivos)"
fi

# --- 3. Sitio de PHPUnit -----------------------------------------------------------------------------
paso "Sitio de pruebas unitarias (PHPUnit)"
if en_moodle php public/admin/tool/phpunit/cli/util.php --diag > /dev/null 2>&1; then
  listo "Ya estaba inicializado"
else
  echo "   Se inicializa (instala Composer y crea las tablas de prueba; es el paso largo)."
  en_moodle php public/admin/tool/phpunit/cli/init.php || fallo "init.php falló." "Revise la salida de arriba y vuelva a correr el script."
  listo "Inicializado"
fi
en_moodle php public/admin/tool/phpunit/cli/util.php --buildcomponentconfigs > /dev/null \
  || fallo "No se pudo generar la configuración de PHPUnit por componente."
listo "Configuración de PHPUnit por componente generada"

# --- 4. Sitio de Moodle, datos y API -----------------------------------------------------------------
paso "Sitio de Moodle y datos de prueba"
if en_moodle php admin/cli/cfg.php --name=release > /dev/null 2>&1; then
  listo "El sitio ya estaba instalado"
else
  en_moodle php admin/cli/install_database.php --agree-license --lang=en \
    --fullname="Moodle de pruebas" --shortname="Pruebas" \
    --adminuser=admin --adminpass='Pruebas-2026' --adminemail=admin@example.com \
    || fallo "La instalación del sitio falló." "Revise la salida de arriba."
  listo "Sitio instalado"
  resembrar=si
fi
sembrado=$(compose exec -T db psql -U moodle -d moodle -tAc "select count(*) from mdl_course where shortname = 'LAB-PRUEBAS'" 2>/dev/null | tr -d '[:space:]')
if [ "$resembrar" = si ] || [ "${sembrado:-0}" = 0 ]; then
  en_moodle php pruebas/seed/sembrar.php > /dev/null || fallo "La siembra falló." "Corra a mano: docker compose run --rm moodle php pruebas/seed/sembrar.php"
  listo "Datos sembrados"
else
  listo "Los datos ya estaban sembrados (use --sembrar para volver al estado inicial)"
fi
en_moodle php pruebas/seed/servicios_web.php > /dev/null || fallo "No se pudo habilitar la API REST."
listo "API REST habilitada, con un token por usuario"

# --- 5. Moodle en el navegador y prueba de humo ------------------------------------------------------
paso "Moodle en http://localhost:8000"
compose up -d web cron > /dev/null 2>&1 || fallo "No arrancaron el servidor web y el cron." "Revise: docker compose logs web (desde pruebas/docker)."
bash pruebas/ci/humo.sh || fallo "La prueba de humo falló." "Revise: docker compose logs web (desde pruebas/docker)."

printf '\n\033[1;32mEntorno listo.\033[0m Moodle: http://localhost:8000 (usuarios en la sección 9 de la guía).\n'
printf 'Para que Moodle vea los cambios que guarde, deje en otra ventana, desde pruebas/docker:\n'
printf '  docker compose watch web cron\n'
