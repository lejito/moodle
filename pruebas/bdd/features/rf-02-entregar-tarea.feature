# language: es
#
# Cada escenario implementa el caso de caja negra que lleva en el nombre (MOOD-CP-NNN) y parte del
# estado que le deja pruebas/seed/preparar.php: la «Tarea de laboratorio» sin entregas, abierta,
# con vencimiento en 7 días y corte en 14, y con borradores (guardar no la envía).
@rf-02
Característica: RF-MOOD-02 · Entregar una tarea
  Para que el docente califique mi trabajo
  como estudiante del curso
  quiero entregar la tarea con un texto en línea y enviarla para calificar

  Regla: una entrega necesita contenido y se acepta hasta la fecha de corte

    Escenario: MOOD-CP-201 - Guarda el texto como borrador y después lo envía para calificar
      Dado que Ana inició sesión
      Y que ella abrió la tarea
      Cuando ella guarda la entrega con el texto "Entrega del laboratorio de pruebas"
      Entonces el estado de su entrega es "Draft (not submitted)"
      Cuando ella envía la entrega para calificar
      Entonces el estado de su entrega es "Submitted for grading"
      Y ella ya no puede editar la entrega

    Escenario: MOOD-CP-202 - Guardar sin contenido no crea la entrega
      Dado que Ana inició sesión
      Y que ella abrió la tarea
      Cuando ella guarda la entrega con el texto ""
      Entonces ella ve el aviso "Nothing was submitted"

    Escenario: MOOD-CP-210 - Después del vencimiento la entrega se acepta como tardía
      Dado que Ana inició sesión
      Y que ella abrió la tarea
      Cuando ella guarda la entrega con el texto "Entrega tardía"
      Y ella envía la entrega para calificar
      Entonces el estado de su entrega es "Submitted for grading"
      Y su entrega figura como tardía

    Escenario: MOOD-CP-211 - Después de la fecha de corte ya no se puede entregar
      Dado que Ana inició sesión
      Cuando ella abre la tarea
      Entonces ella no tiene cómo agregar una entrega
