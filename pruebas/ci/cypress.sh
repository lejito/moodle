#!/bin/sh
# Corre una suite de Cypress dentro de la imagen de Cypress (pruebas/docker/cypress.Dockerfile), desde
# la carpeta pruebas/. Lo usa el Jenkinsfile:
#
#   sh ci/cypress.sh cypress.config.js         # E2E
#   sh ci/cypress.sh cypress.api.config.js     # API
#
# node_modules queda en el clon de Jenkins entre etapas y builds: solo se reinstala si cambió
# package-lock.json.
set -eu

huella=$(sha1sum package-lock.json)
if [ "$(cat node_modules/.huella 2>/dev/null)" != "$huella" ]; then
  npm ci --no-audit --no-fund
  echo "$huella" > node_modules/.huella
fi
exec npx cypress run --config-file "$1"
