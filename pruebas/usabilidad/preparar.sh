#!/usr/bin/env bash
# Deja el Moodle local listo para una tarea de las pruebas de usabilidad con usuarios, o para todas.
#
#   bash pruebas/usabilidad/preparar.sh T1     # antes de la tarea 1 de cada participante
#   bash pruebas/usabilidad/preparar.sh todas  # antes de cada sesión: T1, T4 y T5 (T2 y T3 comparten
#                                              # la tarea, así que se preparan justo antes de cada una)
#
# Se corre desde la raíz del repositorio, en Git Bash, con el entorno local levantado (pruebas/docker).
# Cada tarea usa la preparación de un caso de caja negra (pruebas/seed/preparar.php), que deshace lo
# que hizo el participante anterior:
#
#   T1 (RF-MOOD-01) MOOD-CP-101  Bruno sin matricular, la automatriculación con la clave Clave-2026
#   T2 (RF-MOOD-02) MOOD-CP-201  la tarea abierta y sin entregas
#   T3 (RF-MOOD-03) MOOD-CP-301  el texto de Ana enviado para calificar, sin nota
#   T4 (RF-MOOD-04) MOOD-CP-401  el cuestionario abierto, sin intentos
#   T5 (RF-MOOD-05) MOOD-CP-501  el foro con solo el debate inicial de Diana
set -euo pipefail

declare -A casos=([T1]=MOOD-CP-101 [T2]=MOOD-CP-201 [T3]=MOOD-CP-301 [T4]=MOOD-CP-401 [T5]=MOOD-CP-501)

preparar() {
  local tarea=$1
  local caso=${casos[$tarea]:-}
  if [ -z "$caso" ]; then
    echo "Tarea desconocida: $tarea. Use T1, T2, T3, T4, T5 o todas." >&2
    exit 1
  fi
  (cd "$(dirname "$0")/../docker" && docker compose exec -T web php pruebas/seed/preparar.php "$caso" > /dev/null)
  echo "$tarea lista ($caso)."
}

case "${1:-}" in
  todas) for tarea in T1 T4 T5; do preparar "$tarea"; done ;;
  T[1-5]) preparar "$1" ;;
  *) echo "Uso: bash pruebas/usabilidad/preparar.sh T1|T2|T3|T4|T5|todas" >&2; exit 1 ;;
esac
