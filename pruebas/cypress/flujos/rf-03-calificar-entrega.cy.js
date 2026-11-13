// RF-MOOD-03 · Calificar una entrega.
//
// Casos de caja negra MOOD-CP-301 a 315. Cada caso empieza con preparar.php: la tarea sin notas y,
// salvo que el caso diga otra cosa, con un texto de estudiante.a enviado para calificar. Califica
// el docente en el calificador de la tarea; el resultado se comprueba también como estudiante.a.

describe('RF-MOOD-03 · Calificar una entrega', () => {
  let datos;

  /** Prepara el caso e inicia sesión con el usuario dado. */
  const prepararComo = (caso, usuario = 'docente') => {
    cy.preparar(caso).then((d) => {
      datos = d;
      cy.iniciarSesion(usuario, d.contrasena);
    });
  };

  /** Abre el calificador de la tarea en la entrega de estudiante.a. */
  const abrirCalificador = () => cy.then(() => {
    cy.abrir(`/mod/assign/view.php?id=${datos.tarea}&action=grader&userid=${datos.estudiante}`);
    cy.contains('[data-region="grade-panel"]', 'Grade out of 100', { timeout: 20000 }).should('be.visible');
    cy.esperarMoodle();
  });

  /** Escribe la nota (y el comentario, si se da) y guarda. */
  const calificar = (nota, comentario = null) => {
    cy.get('[data-region="grade-panel"] input[name="grade"]').clear();
    if (nota !== '') {
      cy.get('[data-region="grade-panel"] input[name="grade"]').type(nota);
    }
    if (comentario !== null) {
      cy.get('textarea[name="assignfeedbackcomments_editor[text]"]').clear().type(comentario);
    }
    cy.get('[data-region="grade-actions"] button[name="savechanges"]').click();
    cy.esperarMoodle();
  };

  /**
   * Comprueba que Moodle guardó la nota: el calificador la muestra como "Current grade in
   * gradebook". El aviso de guardado es un mensaje emergente que dura poco, así que no se usa.
   */
  const debeGuardarse = (nota) => {
    cy.contains('.fitem', 'Current grade in gradebook').should('contain', nota);
  };

  /** Comprueba que el calificador muestra el error junto a la nota y que no hay nota guardada. */
  const debeRechazarse = (mensaje) => {
    cy.get('[data-region="grade-panel"]').contains(mensaje).should('be.visible');
    cy.contains('.fitem', 'Current grade in gradebook').should('not.contain', '.00');
  };

  /** Entra como estudiante.a a la tarea y devuelve la sección de retroalimentación. */
  const vistaDelEstudiante = () => {
    cy.then(() => cy.iniciarSesion('estudiante.a', datos.contrasena));
    cy.then(() => cy.abrir(`/mod/assign/view.php?id=${datos.tarea}`));
  };

  /**
   * Comprueba la nota que ve estudiante.a en la sección "Feedback" de la tarea, por ejemplo
   * "85.00 / 100.00". Moodle separa con espacios de no separación (&nbsp;), que se cambian por
   * espacios normales antes de comparar.
   */
  const debeVerLaNota = (nota) => {
    cy.contains('h3', 'Feedback').parent()
      .contains('th', /^Grade$/).next('td').invoke('text')
      .should((texto) => expect(texto.replace(/ /g, ' ').trim()).to.eq(`${nota} / 100.00`));
  };

  it('MOOD-CP-301 - califica con 85 y comentario, y el estudiante los ve', () => {
    prepararComo('MOOD-CP-301');
    abrirCalificador();
    calificar('85', 'Buen trabajo');
    debeGuardarse('85.00');

    vistaDelEstudiante();
    debeVerLaNota('85.00');
    cy.contains('Buen trabajo').should('be.visible');
  });

  it('MOOD-CP-302 - guarda la nota mínima, 0', () => {
    prepararComo('MOOD-CP-302');
    abrirCalificador();
    calificar('0');
    debeGuardarse('0.00');
    vistaDelEstudiante();
    debeVerLaNota('0.00');
  });

  it('MOOD-CP-303 - guarda la nota máxima, 100', () => {
    prepararComo('MOOD-CP-303');
    abrirCalificador();
    calificar('100');
    debeGuardarse('100.00');
    vistaDelEstudiante();
    debeVerLaNota('100.00');
  });

  it('MOOD-CP-304 - rechaza 100.01, mayor que el máximo', () => {
    prepararComo('MOOD-CP-304');
    abrirCalificador();
    calificar('100.01');
    debeRechazarse('Grade must be less than or equal to 100.');
  });

  it('MOOD-CP-305 - rechaza -0.01, menor que cero', () => {
    prepararComo('MOOD-CP-305');
    abrirCalificador();
    calificar('-0.01');
    debeRechazarse('Grade must be greater than or equal to zero.');
  });

  it('MOOD-CP-306 - guarda una nota con decimales, 85.5', () => {
    prepararComo('MOOD-CP-306');
    abrirCalificador();
    calificar('85.5');
    debeGuardarse('85.50');
    vistaDelEstudiante();
    debeVerLaNota('85.50');
  });

  it('MOOD-CP-307 - rechaza una nota no numérica', () => {
    prepararComo('MOOD-CP-307');
    abrirCalificador();
    calificar('ochenta');
    debeRechazarse('The grade provided could not be understood: ochenta');
  });

  it('MOOD-CP-308 - guarda solo el comentario, sin nota', () => {
    prepararComo('MOOD-CP-308');
    abrirCalificador();
    calificar('', 'Falta la conclusión');
    cy.esperarMoodle();
    vistaDelEstudiante();
    cy.contains('Falta la conclusión').should('be.visible');
    cy.contains(/\d+\.\d\d \/ 100\.00/).should('not.exist');
  });

  it('MOOD-CP-309 - califica a un estudiante sin entrega', () => {
    prepararComo('MOOD-CP-309');
    abrirCalificador();
    calificar('40');
    debeGuardarse('40.00');
    vistaDelEstudiante();
    debeVerLaNota('40.00');
  });

  it('MOOD-CP-310 - sobrescribe una nota: de 80 a 90', () => {
    prepararComo('MOOD-CP-310');
    abrirCalificador();
    cy.get('[data-region="grade-panel"] input[name="grade"]').should('have.value', '80.00');
    calificar('90');
    debeGuardarse('90.00');
    cy.then(() => cy.abrir(`/grade/report/grader/index.php?id=${datos.curso}`));
    cy.contains('tr', 'Ana Estudiante').should('contain', '90.00');
  });

  it('MOOD-CP-311 - la nota queda en el libro de calificaciones', () => {
    prepararComo('MOOD-CP-311');
    abrirCalificador();
    calificar('85');
    debeGuardarse('85.00');

    // Informe del calificador, como docente.
    cy.then(() => cy.abrir(`/grade/report/grader/index.php?id=${datos.curso}`));
    cy.contains('tr', 'Ana Estudiante').should('contain', '85.00');

    // Informe del usuario, como estudiante.a.
    cy.then(() => cy.iniciarSesion('estudiante.a', datos.contrasena));
    cy.then(() => cy.abrir(`/grade/report/user/index.php?id=${datos.curso}`));
    cy.contains('tr', datos.nombreTarea).should('contain', '85.00');
  });

  it('MOOD-CP-312 - con flujo de calificación, la nota se ve solo al publicarla', () => {
    prepararComo('MOOD-CP-312');
    abrirCalificador();
    cy.get('select[name="workflowstate"]').select('In marking');
    calificar('70');
    // Con flujo de calificación, el libro de calificaciones no se actualiza hasta publicar: se
    // comprueba que el calificador conserva la nota.
    abrirCalificador();
    cy.get('[data-region="grade-panel"] input[name="grade"]').should('have.value', '70.00');
    vistaDelEstudiante();
    cy.contains('70.00 / 100.00').should('not.exist');

    cy.then(() => cy.iniciarSesion('docente', datos.contrasena));
    abrirCalificador();
    cy.get('select[name="workflowstate"]').select('Released');
    cy.get('[data-region="grade-actions"] button[name="savechanges"]').click();
    cy.esperarMoodle();
    vistaDelEstudiante();
    debeVerLaNota('70.00');
  });

  it('MOOD-CP-313 - no deja cambiar una nota bloqueada en el libro de calificaciones', () => {
    prepararComo('MOOD-CP-313');
    abrirCalificador();
    // Con la nota bloqueada, el calificador ni siquiera ofrece el campo de la nota.
    cy.contains('This grade is locked or overridden in the gradebook.').should('be.visible');
    cy.get('[data-region="grade-panel"] input[name="grade"]').should('not.exist');
    cy.contains('.fitem', 'Current grade in gradebook').should('contain', '60.00');
    cy.then(() => cy.abrir(`/grade/report/grader/index.php?id=${datos.curso}`));
    cy.contains('tr', 'Ana Estudiante').should('contain', '60.00');
  });

  it('MOOD-CP-314 - un estudiante no puede abrir el calificador', () => {
    prepararComo('MOOD-CP-314', 'estudiante.a');
    cy.then(() => cy.visit(
      `/mod/assign/view.php?id=${datos.tarea}&action=grader&userid=${datos.estudiante}`,
      { failOnStatusCode: false },
    ));
    // Con la depuración del sitio de pruebas, Moodle muestra la excepción en lugar del aviso.
    cy.contains(/do not currently have permissions|nopermission/).should('exist');
    cy.get('[data-region="grade-panel"]').should('not.exist');
  });

  it('MOOD-CP-315 - un estudiante no ve la nota de otro', () => {
    prepararComo('MOOD-CP-315', 'estudiante.a');
    cy.then(() => cy.visit(
      `/grade/report/user/index.php?id=${datos.curso}&userid=${datos.apoyo}`,
      { failOnStatusCode: false },
    ));
    cy.contains('Apoyo 1').should('not.exist');
    cy.contains('50.00').should('not.exist');
  });
});
