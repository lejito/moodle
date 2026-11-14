#!/usr/bin/env bash
# Copia el repositorio al volumen codigo, del que Moodle lee en los contenedores.
# Se corre una vez al preparar el entorno, o si el volumen se borró
# (docker compose down -v). Después, docker compose watch mantiene el volumen al
# día con cada archivo que se guarda.
#
#   bash pruebas/docker/copiar-codigo.sh      # desde la raíz del repositorio
#
# Copia los archivos versionados y los nuevos que git no ignora, más config.php,
# que git ignora pero Moodle necesita. Con el repositorio en una carpeta de
# Windows tarda unos 25 minutos (~68 000 archivos); se hace una sola vez.
#
# Después devuelve los finales de línea a LF. Git para Windows trae
# core.autocrlf=true, así que en la carpeta de Windows casi todo queda con CRLF,
# aunque git lo guarda con LF. Moodle corre en Linux, y algunas pruebas comparan
# contra plantillas y archivos de datos tal cual: con CRLF fallan, aunque pasan en
# Jenkins, que clona en Linux. Solo se tocan los archivos que git guarda con LF y
# la carpeta tiene con CRLF (git ls-files --eol); los demás quedan igual.
#
#   bash pruebas/docker/copiar-codigo.sh --solo-lf   # solo esa conversión
set -euo pipefail

# Git Bash convierte por su cuenta las rutas que empiezan con / en rutas de Windows (/var/www/moodle
# pasaría a C:/Program Files/Git/var/www/moodle), y esas rutas son del contenedor. En Linux no hace nada.
export MSYS_NO_PATHCONV=1

raiz=$(git rev-parse --show-toplevel)
cd "$raiz"

if [ ! -f config.php ]; then
  echo "Falta config.php en la raíz: cópielo de pruebas/docker/config.php." >&2
  exit 1
fi

en_volumen() { docker compose -f pruebas/docker/compose.yml run --rm --no-deps -T moodle "$@"; }

if [ "${1:-}" != --solo-lf ]; then
  { git ls-files -co --exclude-standard -z; printf 'config.php\0'; } \
    | tar --null -T - -cf - \
    | en_volumen tar -xf - -C /var/www/moodle
  echo "Código copiado al volumen."
fi

echo "Pasando a LF los archivos que git guarda con LF (tarda un par de minutos)..."
git ls-files -z --eol \
  | grep -z $'^i/lf *w/crlf' \
  | sed -z 's/^[^\t]*\t//' \
  | en_volumen sh -c 'cd /var/www/moodle && xargs -0 -r sed -i "s/\r\$//"'
echo "Finales de línea corregidos."
