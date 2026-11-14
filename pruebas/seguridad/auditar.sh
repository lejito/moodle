#!/usr/bin/env bash
# Revisión de dependencias y análisis dinámico de seguridad (criterio 13): composer audit, npm audit
# y el escaneo pasivo de ZAP (baseline) contra el Moodle que está corriendo. Todo corre en contenedores,
# así que solo hace falta Docker.
#
#   bash pruebas/seguridad/auditar.sh            # en local, contra el entorno de pruebas/docker
#
# Se corre desde la raíz del repositorio. Deja en pruebas/reportes/auditoria/:
#   composer.json, npm-moodle.json, npm-pruebas.json   los avisos de cada auditoría
#   zap.html, zap.json                                 el reporte de ZAP
#   resumen.md                                         la cantidad de avisos por herramienta y severidad
#
# Variables (las usa el Jenkinsfile; en local no hacen falta):
#   MONTAJE      argumentos de docker para ver el repositorio (por defecto, la carpeta actual en /repo)
#   RUTA         dónde queda el repositorio dentro de los contenedores (por defecto /repo)
#   RED_MOODLE   el contenedor de Moodle con cuya red corre ZAP (por defecto moodle-pruebas-web-1)
#   URL_MOODLE   la dirección de Moodle, la de su wwwroot (por defecto http://localhost:8000)
#
# No falla por los avisos encontrados: los informa. Falla solo si una herramienta no pudo correr.
set -euo pipefail

if [ -z "${MONTAJE:-}" ]; then
  # En Git Bash, docker necesita la ruta de Windows de la carpeta.
  MONTAJE="-v $(pwd -W 2>/dev/null || pwd):/repo"
fi
RUTA=${RUTA:-/repo}
RED_MOODLE=${RED_MOODLE:-moodle-pruebas-web-1}
URL_MOODLE=${URL_MOODLE:-http://localhost:8000}
SALIDA=pruebas/reportes/auditoria
export MSYS_NO_PATHCONV=1

rm -rf "$SALIDA"
mkdir -p "$SALIDA"

echo "1/4 composer audit (dependencias PHP de composer.lock)"
# Sale con 1 si hay avisos, y eso no es un error de la herramienta.
docker run --rm $MONTAJE -w "$RUTA" composer:2.10.3 audit --locked --format=json --no-interaction \
  > "$SALIDA/composer.json" || [ -s "$SALIDA/composer.json" ]

echo "2/4 npm audit (dependencias de Moodle, npm-shrinkwrap.json)"
docker run --rm $MONTAJE -w "$RUTA" node:22.23.4-alpine npm audit --package-lock-only --json \
  > "$SALIDA/npm-moodle.json" || [ -s "$SALIDA/npm-moodle.json" ]

echo "3/4 npm audit (dependencias de las pruebas, pruebas/package-lock.json)"
docker run --rm $MONTAJE -w "$RUTA/pruebas" node:22.23.4-alpine npm audit --package-lock-only --json \
  > "$SALIDA/npm-pruebas.json" || [ -s "$SALIDA/npm-pruebas.json" ]

echo "4/4 ZAP baseline contra $URL_MOODLE"
# ZAP corre en la red del contenedor de Moodle: así llega a la dirección de su wwwroot. -I: los avisos
# no hacen fallar el escaneo. Los reportes se copian fuera del contenedor al terminar.
docker rm -f zap-auditoria > /dev/null 2>&1 || true
docker run --name zap-auditoria --network "container:$RED_MOODLE" --entrypoint sh zaproxy/zap-stable:2.16.1 -c \
  "mkdir -p /zap/wrk && zap-baseline.py -t '$URL_MOODLE' -m 3 -r zap.html -J zap.json -I" || true
docker cp zap-auditoria:/zap/wrk/zap.html "$SALIDA/zap.html"
docker cp zap-auditoria:/zap/wrk/zap.json "$SALIDA/zap.json"
docker rm -f zap-auditoria > /dev/null

# Resumen legible, con la cantidad de avisos por herramienta.
docker run --rm $MONTAJE -w "$RUTA" node:22.23.4-alpine node pruebas/seguridad/resumen.js "$SALIDA"
cat "$SALIDA/resumen.md"
