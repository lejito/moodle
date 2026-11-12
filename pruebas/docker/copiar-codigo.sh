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
set -euo pipefail

raiz=$(git rev-parse --show-toplevel)
cd "$raiz"

if [ ! -f config.php ]; then
  echo "Falta config.php en la raíz: cópielo de pruebas/docker/config.php." >&2
  exit 1
fi

{ git ls-files -co --exclude-standard -z; printf 'config.php\0'; } \
  | tar --null -T - -cf - \
  | docker compose -f pruebas/docker/compose.yml run --rm --no-deps -T moodle \
      tar -xf - -C /var/www/moodle

echo "Código copiado al volumen."
