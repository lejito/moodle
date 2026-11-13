#!/usr/bin/env bash
# Corre en local, sin Jenkins, las pruebas unitarias (PHPUnit) de las funcionalidades
# del proyecto y muestra el resultado de cada prueba. Usa el entorno de pruebas/docker,
# que debe estar preparado (sección 6 de la guía).
#
#   bash pruebas/unitarias.sh [opciones] [rf-01 ... rf-05]     # desde la raíz, en Git Bash
#
# Sin funcionalidades, corre las cinco. Opciones:
#
#   --caja-blanca      solo las pruebas de caja blanca (carpetas tests/caja_blanca)
#   --caja-negra       solo las de caja negra que corren en PHPUnit (tests/caja_negra): los
#                      límites de tiempo al segundo; el resto de la caja negra es E2E
#   --cobertura        además mide la cobertura (más lento) y genera su reporte navegable
#   --filter <texto>   solo las pruebas cuyo nombre contenga el texto, por ejemplo un ID de caso
#
# En la terminal, cada prueba sale en una línea con ✔ (pasó), ✘ (falló) o ↩ (omitida),
# agrupadas por clase, y al final un resumen por componente. Los reportes quedan en
# pruebas/reportes/unitarias/ (o caja-blanca/, caja-negra/), que se borra al empezar cada ejecución:
#
#   index.html                 resumen de la ejecución, con enlaces a lo demás
#   <componente>.html          el resultado de cada prueba (TestDox)
#   <componente>.xml           lo mismo en JUnit, el formato que archiva Jenkins
#   cobertura/<componente>/    cobertura navegable, con --cobertura
#
# Los componentes de cada funcionalidad son los de las etapas de "Pruebas unitarias" del
# Jenkinsfile; si cambian allá, se cambian aquí (función componentes).
#
# El script se ejecuta a sí mismo dentro del contenedor moodle (variable DENTRO), con una
# sola llamada a docker compose para todas las pruebas.
set -uo pipefail

# --- Funcionalidad -> componentes (nombre:carpeta), igual que el Jenkinsfile.
componentes() {
  case $1 in
    01) echo enrol_self:public/enrol/self ;;
    02) echo mod_assign:public/mod/assign \
          assignsubmission_onlinetext:public/mod/assign/submission/onlinetext \
          assignsubmission_file:public/mod/assign/submission/file ;;
    03) echo mod_assign:public/mod/assign ;;
    04) echo mod_quiz:public/mod/quiz
        for regla in delaybetweenattempts ipaddress numattempts offlineattempts \
                     openclosedate password securewindow timelimit; do
          echo "quizaccess_$regla:public/mod/quiz/accessrule/$regla"
        done ;;
    05) echo mod_forum:public/mod/forum ;;
  esac
}

titulo() {
  case $1 in
    01) echo 'Automatricularse con clave' ;;
    02) echo 'Entregar una tarea' ;;
    03) echo 'Calificar una entrega' ;;
    04) echo 'Presentar un cuestionario' ;;
    05) echo 'Participar en un foro' ;;
  esac
}

error() { echo "ERROR: $*" >&2; exit 2; }

# ======================================================================================
# Fuera del contenedor: validar los argumentos y entrar.
# ======================================================================================
if [ -z "${DENTRO:-}" ]; then
  script=$(cat "$0")
  rfs=()
  for arg in "$@"; do
    case $arg in
      --caja-blanca | --caja-negra | --cobertura | --filter) ;;
      -*) error "Opción desconocida: $arg" ;;
      *)
        # El texto de --filter no es una funcionalidad.
        [ "${anterior:-}" = --filter ] || {
          n=$(printf '%s' "$arg" | tr -cd '0-9')
          n=$(printf '%02d' "$((10#${n:-0}))")
          [ -n "$(componentes "$n")" ] || error "Funcionalidad desconocida: $arg (son rf-01 a rf-05)."
        } ;;
    esac
    anterior=$arg
  done
  raiz=$(git rev-parse --show-toplevel 2>/dev/null) || error "Ejecuta el script dentro del repositorio."
  [ -f "$raiz/config.php" ] || error "Falta config.php en la raíz: ver la sección 6 de la guía, paso 2."
  docker info >/dev/null 2>&1 || error "Docker no responde. Abre Docker Desktop y vuelve a intentarlo."
  cd "$raiz/pruebas/docker"
  exec docker compose run --rm -T -e DENTRO=1 -e FECHA="$(date '+%Y-%m-%d %H:%M')" \
    moodle bash -c "$script" unitarias "$@"
fi

# ======================================================================================
# Dentro del contenedor (en la raíz del código, /var/www/moodle).
# ======================================================================================
caja=no
cobertura=no
filtro=''
pedidas=()
while [ $# -gt 0 ]; do
  case $1 in
    --caja-blanca) caja=blanca ;;
    --caja-negra) caja=negra ;;
    --cobertura) cobertura=si ;;
    --filter) filtro=${2:-}; shift ;;
    *) n=$(printf '%s' "$1" | tr -cd '0-9'); pedidas+=("$(printf '%02d' "$((10#$n))")") ;;
  esac
  shift
done
[ ${#pedidas[@]} -gt 0 ] || pedidas=(01 02 03 04 05)

if [ "$caja" != no ]; then
  salida=pruebas/reportes/caja-$caja
  tipo="Pruebas de caja $caja"
else
  salida=pruebas/reportes/unitarias
  tipo='Pruebas unitarias'
fi
rm -rf "$salida"
mkdir -p "$salida"

# La lista de componentes a correr, sin repetir (RF-02 y RF-03 comparten mod_assign).
declare -A visto=() rf_de=() fallo=()
lista=()
for rf in "${pedidas[@]}"; do
  for c in $(componentes "$rf"); do
    nombre=${c%%:*}
    if [ -z "${visto[$nombre]:-}" ]; then
      visto[$nombre]=si
      lista+=("$c")
      rf_de[$nombre]="RF-MOOD-$rf"
    else
      rf_de[$nombre]="${rf_de[$nombre]} y $rf"
    fi
  done
done

estado=0
corridos=()
for c in "${lista[@]}"; do
  nombre=${c%%:*}
  dir=${c#*:}
  [ -f "$dir/phpunit.xml" ] ||
    error "Falta $dir/phpunit.xml. Prepara el entorno: guía, sección 6, pasos 6 y 7."
  objetivo=()
  if [ "$caja" != no ]; then
    [ -d "$dir/tests/caja_$caja" ] || continue
    # Con una carpeta como argumento, PHPUnit busca *Test.php; las de Moodle son *_test.php.
    objetivo=(--test-suffix _test.php "$dir/tests/caja_$caja")
  fi
  opciones=(--testdox --colors=always
    --testdox-html "$salida/$nombre.html" --log-junit "$salida/$nombre.xml")
  [ -n "$filtro" ] && opciones+=(--filter "$filtro")
  php=(php)
  if [ "$cobertura" = si ]; then
    # Lo mismo que pruebas/ci/phpunit.sh: pcov encendido, y backup/ y las reglas de
    # acceso (rule.php) sumadas a lo que mide el phpunit.xml del componente.
    php=(php -d pcov.enabled=1 -d pcov.directory="$PWD/public")
    opciones+=(--coverage-html "$salida/cobertura/$nombre" --coverage-text="$salida/cobertura/$nombre.txt")
    [ -d "$dir/backup" ] && opciones+=(--coverage-filter "$PWD/$dir/backup")
    [ -f "$dir/rule.php" ] && opciones+=(--coverage-filter "$PWD/$dir")
  fi
  echo
  echo "=== ${rf_de[$nombre]} · $nombre ==="
  "${php[@]}" vendor/bin/phpunit -c "$dir" "${opciones[@]}" "${objetivo[@]}" < /dev/null || { estado=1; fallo[$nombre]=si; }
  corridos+=("$nombre")
done

# --- Resumen, en la terminal y en index.html, a partir de los JUnit.
attr() { sed -n "s/.* $1=\"\([^\"]*\)\".*/\1/p" <<< "$2"; }
filas=''
total_p=0 total_f=0 total_o=0
echo
echo "=== Resumen: $tipo ==="
printf '%-16s %-30s %7s %7s %7s %8s\n' Funcionalidad Componente Pruebas Fallas Omitid. Segundos
for nombre in "${corridos[@]}"; do
  suite=$(grep -m1 -o '<testsuite [^>]*>' "$salida/$nombre.xml" 2>/dev/null || true)
  if [ -z "$suite" ]; then
    # Sin JUnit: o PHPUnit no llegó a correr (error), o no hubo pruebas que correr.
    p=0; o=0; t='-'
    if [ -n "${fallo[$nombre]:-}" ]; then f=error; else f='-'; fi
  else
    p=$(attr tests "$suite"); o=$(attr skipped "$suite"); t=$(attr time "$suite")
    f=$(( $(attr failures "$suite") + $(attr errors "$suite") ))
    t=$(printf '%.1f' "$t")
    total_p=$((total_p + p)); total_o=$((total_o + o))
    total_f=$((total_f + f))
  fi
  printf '%-16s %-30s %7s %7s %7s %8s\n' "${rf_de[$nombre]}" "$nombre" "$p" "$f" "$o" "$t"
  case $f in 0 | -) clase=ok ;; *) clase=mal ;; esac
  enlaces="<a href=\"$nombre.html\">cada prueba</a> · <a href=\"$nombre.xml\">JUnit</a>"
  if [ "$cobertura" = si ] && [ -f "$salida/cobertura/$nombre.txt" ]; then
    lineas=$(sed 's/\x1b\[[0-9;]*m//g' "$salida/cobertura/$nombre.txt" | grep -m1 -o 'Lines: *[0-9.]*%' | grep -o '[0-9.]*%')
    enlaces="$enlaces · <a href=\"cobertura/$nombre/index.html\">cobertura ${lineas:-}</a>"
  fi
  filas="$filas<tr class=\"$clase\"><td>${rf_de[$nombre]}</td><td><code>$nombre</code></td><td>$p</td><td>$f</td><td>$o</td><td>$t</td><td>$enlaces</td></tr>"
done
printf '%-16s %-30s %7s %7s %7s\n' Total '' "$total_p" "$total_f" "$total_o"

if [ ${#corridos[@]} -eq 0 ]; then
  echo "No hubo pruebas que correr con esas opciones."
fi
if [ "$estado" = 0 ]; then veredicto='Todas las pruebas pasaron'; else veredicto='Hubo fallas'; fi
funcionalidades=''
for rf in "${pedidas[@]}"; do funcionalidades="$funcionalidades<li>RF-MOOD-$rf $(titulo "$rf")</li>"; done
cat > "$salida/index.html" <<HTML
<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>$tipo</title>
<style>
  :root { --fondo: #fff; --texto: #1d1d1f; --suave: #6e6e73; --borde: #d2d2d7; --ok: #1a7f37; --mal: #cf222e; }
  @media (prefers-color-scheme: dark) {
    :root { --fondo: #161618; --texto: #f2f2f2; --suave: #a1a1a6; --borde: #3a3a3c; --ok: #4ac26b; --mal: #ff7b72; }
  }
  body { background: var(--fondo); color: var(--texto); font: 15px/1.5 system-ui, sans-serif; margin: 0 auto; max-width: 70rem; padding: 1.5rem 1rem; }
  h1 { font-size: 1.5rem; margin: 0 0 .25rem; }
  .meta { color: var(--suave); margin: 0 0 1rem; }
  .veredicto { font-weight: 600; color: var(--$( [ "$estado" = 0 ] && echo ok || echo mal )); }
  .tabla { overflow-x: auto; }
  table { border-collapse: collapse; width: 100%; }
  th, td { border-bottom: 1px solid var(--borde); padding: .4rem .6rem; text-align: left; white-space: nowrap; }
  td:nth-child(n+3):nth-child(-n+6), th:nth-child(n+3):nth-child(-n+6) { text-align: right; }
  tr.ok td:nth-child(4) { color: var(--ok); }
  tr.mal td:nth-child(4) { color: var(--mal); font-weight: 600; }
  a { color: inherit; }
</style>
</head>
<body>
<h1>$tipo</h1>
<p class="meta">Ejecución local del $FECHA${filtro:+ · filtro <code>$filtro</code>}$( [ "$cobertura" = si ] && echo ' · con cobertura' )</p>
<ul>$funcionalidades</ul>
<p class="veredicto">$veredicto: $total_p pruebas, $total_f con fallas, $total_o omitidas.</p>
<div class="tabla"><table>
<thead><tr><th>Funcionalidad</th><th>Componente</th><th>Pruebas</th><th>Fallas</th><th>Omitidas</th><th>Segundos</th><th>Detalle</th></tr></thead>
<tbody>$filas</tbody>
</table></div>
</body>
</html>
HTML
echo
echo "$veredicto. Reporte: $salida/index.html"
exit $estado
