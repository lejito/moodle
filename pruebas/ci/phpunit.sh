#!/usr/bin/env bash
# Corre con cobertura las pruebas PHPUnit de un componente, o de varios
# subplugins agrupados bajo un nombre. Lo usa el job "Pruebas unitarias" de
# .github/workflows/pruebas.yml, un step por funcionalidad.
#
#   bash pruebas/ci/phpunit.sh <nombre> <carpeta> [<carpeta>...]
#
# Cada carpeta tiene su propio phpunit.xml, generado por
# util.php --buildcomponentconfigs, que limita la cobertura a ese componente.
# Los reportes quedan en coverage/ y reports/, con el nombre del componente; si
# hay varias carpetas, se agrega el nombre de cada una. Todas las carpetas
# corren aunque falle una, y el script falla al final si alguna falló.
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
  echo "::group::$dir"
  vendor/bin/phpunit -c "$dir" \
    --coverage-clover "coverage/$report.xml" \
    --log-junit "reports/$report.xml" || status=1
  echo "::endgroup::"
done
exit $status
