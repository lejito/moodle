#!/bin/sh
# Corre una suite de Node (Cypress o Cucumber) dentro de su imagen, desde la carpeta pruebas/. Lo usa
# el Jenkinsfile:
#
#   sh ci/node.sh npx cypress run --config-file cypress.api.config.js
#   sh ci/node.sh npx cucumber-js bdd/features
#
# node_modules queda en el clon de Jenkins entre etapas y builds: solo se reinstala si cambió
# package-lock.json.
set -eu

huella=$(sha1sum package-lock.json)
if [ "$(cat node_modules/.huella 2>/dev/null)" != "$huella" ]; then
  npm ci --no-audit --no-fund
  echo "$huella" > node_modules/.huella
fi
exec "$@"
