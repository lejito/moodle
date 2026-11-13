# language: es
#
# Cada escenario implementa el caso de caja negra que lleva en el nombre (MOOD-CP-NNN) y parte del
# estado que le deja pruebas/seed/preparar.php: la entrega de texto de Ana enviada para calificar,
# sin nota, en una tarea calificada sobre 100.
@rf-03
Característica: RF-MOOD-03 · Calificar una entrega
  Para que los estudiantes conozcan su resultado
  como docente del curso
  quiero calificar cada entrega con una nota válida y un comentario

  Regla: la nota va de 0 a 100 y el estudiante ve la que se guardó

    Escenario: MOOD-CP-301 - Califica con nota y comentario, y la estudiante los ve
      Dado que Diana inició sesión
      Y que ella abrió la entrega de Ana en el calificador
      Cuando ella califica con "85" y el comentario "Buen trabajo"
      Entonces la nota en el libro de calificaciones es "85.00"
      Cuando Ana inicia sesión y abre la tarea
      Entonces ella ve la nota "85.00 / 100.00"
      Y ella ve el aviso "Buen trabajo"

    Esquema del escenario: <caso> - Una nota fuera de rango o no numérica no se guarda (<nota>)
      Dado que Diana inició sesión
      Y que ella abrió la entrega de Ana en el calificador
      Cuando ella califica con "<nota>"
      Entonces ella ve el aviso "<mensaje>"
      Y la entrega sigue sin nota

      Ejemplos:
        | caso        | nota    | mensaje                                              |
        | MOOD-CP-304 | 100.01  | Grade must be less than or equal to 100.             |
        | MOOD-CP-305 | -0.01   | Grade must be greater than or equal to zero.         |
        | MOOD-CP-307 | ochenta | The grade provided could not be understood: ochenta |
