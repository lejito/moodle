# language: es
#
# Cada escenario implementa el caso de caja negra que lleva en el nombre (MOOD-CP-NNN) y parte del
# estado que le deja pruebas/seed/preparar.php: el «Cuestionario de laboratorio» abierto, con 2
# intentos y sin intentos de nadie. Tres preguntas de 1 punto (verdadero o falso: True; respuesta
# corta: frog vale 1 y toad 0.8; numérica: 3.14), sobre una nota de 10.
@rf-04
Característica: RF-MOOD-04 · Presentar un cuestionario
  Para saber cuánto aprendí
  como estudiante del curso
  quiero presentar el cuestionario y ver mi nota al terminar

  Regla: la nota suma lo que vale cada respuesta y solo se presenta dentro del horario y de los intentos

    Esquema del escenario: <caso> - Presenta el cuestionario y obtiene <nota> de 10
      Dado que Ana inició sesión
      Y que ella abrió el cuestionario
      Cuando ella empieza un intento
      Y ella responde "<verdadero o falso>", "<respuesta corta>" y "<numérica>"
      Y ella termina el intento
      Entonces su nota del intento es "<nota> out of 10.00"

      Ejemplos:
        | caso        | verdadero o falso | respuesta corta | numérica | nota  |
        | MOOD-CP-401 | True              | frog            | 3.14     | 10.00 |
        | MOOD-CP-402 | True              | toad            | 3.14     | 9.33  |
        | MOOD-CP-403 | False             | cat             | 3        | 0.00  |

    Escenario: MOOD-CP-407 - Antes de la apertura no se puede presentar
      Dado que Ana inició sesión
      Cuando ella abre el cuestionario
      Entonces ella ve el aviso "This quiz is currently not available."
      Y ella no puede empezar un intento

    Escenario: MOOD-CP-410 - Sin intentos restantes no se puede presentar otro
      Dado que Ana inició sesión
      Cuando ella abre el cuestionario
      Entonces ella ve el aviso "No more attempts are allowed"
      Y ella no puede empezar un intento
