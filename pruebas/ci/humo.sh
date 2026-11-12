#!/usr/bin/env bash
# Prueba de humo del Moodle desplegado: responde la interfaz y responde la API REST con un token real.
#
#   bash pruebas/ci/humo.sh [url] [archivo de servicios web]
#
# Por defecto usa http://localhost:8000 y pruebas/reportes/servicios-web.json, que escribe
# pruebas/seed/servicios_web.php. Falla si algo no responde como se espera.
set -euo pipefail

url=${1:-http://localhost:8000}
datos=${2:-pruebas/reportes/servicios-web.json}

# 1. La página de inicio de sesión, con reintentos mientras Apache arranca.
codigo=000
for _ in $(seq 1 30); do
  codigo=$(curl -s -o /dev/null -w '%{http_code}' "$url/login/index.php" || true)
  [ "$codigo" = 200 ] && break
  sleep 2
done
[ "$codigo" = 200 ] || { echo "Interfaz: /login/index.php respondió $codigo" >&2; exit 1; }
echo "Interfaz: /login/index.php responde 200."

# 2. La API REST, con el token de estudiante.a.
token=$(grep -o '"estudiante.a": *"[0-9a-f]*"' "$datos" | grep -o '[0-9a-f]\{32\}')
[ -n "$token" ] || { echo "No hay token de estudiante.a en $datos" >&2; exit 1; }
respuesta=$(curl -s "$url/webservice/rest/server.php?wstoken=$token&wsfunction=core_webservice_get_site_info&moodlewsrestformat=json")
if ! grep -q '"username":"estudiante.a"' <<< "$respuesta"; then
  echo "API REST: respuesta inesperada: $respuesta" >&2
  exit 1
fi
echo "API REST: core_webservice_get_site_info responde como estudiante.a."

# 3. Los datos sembrados: estudiante.a está matriculado en el curso de laboratorio.
userid=$(grep -o '"userid":[0-9]*' <<< "$respuesta" | grep -o '[0-9]*$')
cursos=$(curl -s "$url/webservice/rest/server.php?wstoken=$token&wsfunction=core_enrol_get_users_courses&moodlewsrestformat=json&userid=$userid")
if ! grep -q '"shortname":"LAB-PRUEBAS"' <<< "$cursos"; then
  echo "API REST: estudiante.a no aparece matriculado en LAB-PRUEBAS: $cursos" >&2
  exit 1
fi
echo "Datos sembrados: estudiante.a está matriculado en LAB-PRUEBAS."
