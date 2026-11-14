# language: es
#
# Cada escenario implementa el caso de caja negra que lleva en el nombre (MOOD-CP-NNN) y parte del
# estado que le deja pruebas/seed/preparar.php: el «Foro de laboratorio» con solo el «Debate
# inicial» de Diana, la docente («¿Qué esperan aprender en este curso?»).
@rf-05
Característica: RF-MOOD-05 · Participar en un foro
  Para discutir los temas del curso con mis compañeros
  como estudiante del curso
  quiero leer los debates del foro y responderlos

  Regla: se responde a un debate abierto, en un foro general y antes de la fecha de corte

    Escenario: MOOD-CP-501 - Lee el debate y lo responde
      Dado que Ana inició sesión
      Cuando ella abre el debate inicial
      Entonces ella ve el aviso "¿Qué esperan aprender en este curso?"
      Cuando ella responde "Espero aprender a diseñar pruebas"
      Entonces el debate muestra su respuesta "Espero aprender a diseñar pruebas"

    @accesibilidad
    Escenario: MOOD-CP-576 - Responde al debate usando solo el teclado
      Dado que Ana inició sesión
      Cuando ella abre el debate inicial
      Y ella responde "Respuesta con el teclado" usando solo el teclado
      Entonces el debate muestra su respuesta "Respuesta con el teclado"

    Escenario: MOOD-CP-508 - Después de la fecha de corte no se puede responder
      Dado que Ana inició sesión
      Cuando ella abre el debate inicial
      Entonces ella ve el aviso "The cut-off date for posting to this forum is reached so you can no longer post to it."
      Y ella no puede responder

    Escenario: MOOD-CP-509 - Un debate bloqueado por la docente no se puede responder
      Dado que Ana inició sesión
      Cuando ella abre el debate inicial
      Entonces ella ve el aviso "This discussion has been locked so you can no longer reply to it."
      Y ella no puede responder
