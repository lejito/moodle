#!/usr/bin/env bash
# Evalúa con DeepEval el resumen con IA de Moodle (criterio 14). Activa el proveedor Gemini en Moodle
# (pruebas/seed/ia.php) y corre las pruebas de pruebas/deepeval en un contenedor de Python, en la red
# del Moodle: no hace falta tener Python instalado.
#
#   bash pruebas/deepeval/correr.sh                 # con el entorno local corriendo
#   bash pruebas/deepeval/correr.sh -k "IA-04"      # solo algunos casos (filtro de pytest)
#
# Gasta cupo gratuito de Gemini. Sin GOOGLE_GENERATIVE_AI_API_KEY (en pruebas/.env o en el entorno)
# avisa y termina sin hacer nada. Deja en pruebas/reportes/deepeval/ el JUnit, resultados.json y
# resumen.md, con el resumen de cada texto y la nota y la razón de cada métrica.
#
# Variables (las usa el Jenkinsfile; en local no hacen falta):
#   MONTAJE, RUTA        cómo ve el repositorio el contenedor de Python (por defecto, la carpeta actual)
#   RED_MOODLE           el contenedor de Moodle con cuya red corre (por defecto moodle-pruebas-web-1)
#   URL_MOODLE           la dirección de Moodle (por defecto http://localhost:8000)
#   EN_MOODLE            cómo se ejecuta un comando en el contenedor de Moodle
set -euo pipefail

# Git Bash convierte por su cuenta las rutas que empiezan con / en rutas de Windows, y esas rutas son
# del contenedor. En Linux no hace nada.
export MSYS_NO_PATHCONV=1

# Desde la raíz del repositorio, se llame desde donde se llame (npm run deepeval lo llama desde pruebas/).
cd "$(dirname "$0")/../.."

if [ -z "${GOOGLE_GENERATIVE_AI_API_KEY:-}" ] && [ -f pruebas/.env ]; then
  set -a
  # shellcheck disable=SC1091
  . pruebas/.env
  set +a
fi
if [ -z "${GOOGLE_GENERATIVE_AI_API_KEY:-}" ]; then
  echo "Falta GOOGLE_GENERATIVE_AI_API_KEY (pruebas/.env): no se corre DeepEval."
  exit 0
fi
export GOOGLE_GENERATIVE_AI_API_KEY

if [ -z "${MONTAJE:-}" ]; then
  MONTAJE="-v $(pwd -W 2>/dev/null || pwd):/repo"
fi
RUTA=${RUTA:-/repo}
RED_MOODLE=${RED_MOODLE:-moodle-pruebas-web-1}
URL_MOODLE=${URL_MOODLE:-http://localhost:8000}
EN_MOODLE=${EN_MOODLE:-docker compose -f pruebas/docker/compose.yml exec -T -e GOOGLE_GENERATIVE_AI_API_KEY web}

echo "1/2 Activando el resumen con IA en Moodle"
datos=$($EN_MOODLE php pruebas/seed/ia.php | tail -1)

echo "2/2 DeepEval (el juez es Gemini; tarda unos minutos por el cupo)"
# Se vacía en vez de borrarse: en Windows no se puede borrar una carpeta abierta en otra terminal.
mkdir -p pruebas/reportes/deepeval
find pruebas/reportes/deepeval -mindepth 1 -delete
docker run --rm $MONTAJE -w "$RUTA/pruebas/deepeval" --network "container:$RED_MOODLE" \
  -v moodle-pruebas-pip:/root/.cache/pip \
  -e GOOGLE_GENERATIVE_AI_API_KEY -e MOODLE_URL="$URL_MOODLE" -e MOODLE_IA="$datos" \
  -e DEEPEVAL_TELEMETRY_OPT_OUT=YES \
  python:3.13.17-slim sh -c \
  'pip install -q --root-user-action=ignore --disable-pip-version-check -r requirements.txt \
   && python -m pytest -v -p no:cacheprovider --junitxml=../reportes/deepeval/junit/deepeval.xml "$@"' _ "$@"
