#!/usr/bin/env bash
# Corre con cobertura las pruebas PHPUnit de un componente, o de varios
# subplugins agrupados bajo un nombre. Lo usan las etapas de pruebas unitarias de
# pruebas/jenkins/Jenkinsfile, una por funcionalidad (y el workflow apagado de
# GitHub Actions).
#
#   bash pruebas/ci/phpunit.sh <nombre> <carpeta> [<carpeta>...]
#
# Cada carpeta tiene su propio phpunit.xml, generado por
# util.php --buildcomponentconfigs, que limita la cobertura a ese componente.
# Los reportes quedan en coverage/ y reports/, con el nombre del componente; si
# hay varias carpetas, se agrega el nombre de cada una. Todas las carpetas
# corren aunque falle una, y el script falla al final si alguna falló.
#
# El phpunit.xml de cada componente no mide backup/, aunque sus pruebas de
# backup y restauración lo ejecutan. Si la carpeta existe, se suma a la
# cobertura con --coverage-filter, que agrega directorios a los del XML.
#
# Tampoco mide rule.php, donde está toda la lógica de las reglas de acceso del
# cuestionario (quizaccess_*). --coverage-filter solo acepta carpetas, así que se
# agrega la del subplugin; sus pruebas, idioma y db/ quedan fuera del análisis de
# Sonar por sonar.exclusions y sonar.coverage.exclusions.
#
# pcov se enciende aquí porque la imagen de pruebas/docker lo trae apagado.
#
# Con cobertura, PHPUnit valida los atributos Covers*. Si una prueba declara un
# objetivo que no existe, emite un aviso, descarta toda la cobertura de esa
# prueba y el script falla a propósito: hay que corregir el atributo.
set -u

name=$1
shift
mkdir -p coverage reports

status=0
for dir in "$@"; do
  report=$name
  if [ $# -gt 1 ]; then
    report="$name-$(basename "$dir")"
  fi
  extra=()
  if [ -d "$dir/backup" ]; then
    extra+=(--coverage-filter "$PWD/$dir/backup")
  fi
  if [ -f "$dir/rule.php" ]; then
    extra+=(--coverage-filter "$PWD/$dir")
  fi
  echo "::group::$dir"
  php -d pcov.enabled=1 vendor/bin/phpunit -c "$dir" "${extra[@]}" \
    --coverage-clover "coverage/$report.xml" \
    --log-junit "reports/$report.xml" || status=1
  echo "::endgroup::"
done
exit $status
