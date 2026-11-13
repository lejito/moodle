// RF-MOOD-04 · Presentar un cuestionario.
//
// Casos de caja negra MOOD-CP-401 a 414 (415 y 416, los límites al segundo, están en PHPUnit).
// Cada caso empieza con preparar.php, que restablece el cuestionario sembrado sin intentos. Lo
// presenta estudiante.a; 405 y 406 usan la vista previa del docente.
//
// Las preguntas sembradas: verdadero o falso (True), respuesta corta (frog = 1, toad = 0.8) y
// numérica (3.14, tolerancia 0), de 1 punto cada una, sobre una nota de 10.

describe('RF-MOOD-04 · Presentar un cuestionario', () => {
  let datos;

  /**
   * Prepara el caso, inicia sesión y abre el cuestionario. Con sesionNueva, entra con una sesión
   * propia del caso: Moodle recuerda en la sesión la contraseña del cuestionario ya escrita.
   */
  const prepararYAbrir = (caso, usuario = 'estudiante.a', { sesionNueva = false } = {}) => {
    cy.preparar(caso).then((d) => {
      datos = d;
      cy.iniciarSesion(usuario, d.contrasena, sesionNueva ? { sesion: `${usuario}-${caso}` } : {});
      cy.abrir(`/mod/quiz/view.php?id=${d.cuestionario}`);
    });
  };

  /** Vuelve a la página del cuestionario. */
  const volverAlCuestionario = () => cy.then(() => cy.abrir(`/mod/quiz/view.php?id=${datos.cuestionario}`));

  /** Pulsa el botón principal de la página del cuestionario (Attempt quiz, Preview quiz, etc.). */
  const pulsar = (texto) => {
    cy.contains('button, input[type="submit"]', texto).click();
    cy.esperarMoodle();
  };

  /** Responde las preguntas que se den: { vf: 'True', corta: 'frog', numerica: '3.14' }. */
  const responder = ({ vf, corta, numerica }) => {
    if (vf) {
      cy.contains('.que.truefalse label', vf).click();
    }
    if (corta !== undefined) {
      cy.get('.que.shortanswer input[type="text"]').clear().type(corta);
    }
    if (numerica !== undefined) {
      cy.get('.que.numerical input[type="text"]').clear().type(numerica);
    }
  };

  /** Termina el intento: "Finish attempt", "Submit all and finish" y la confirmación. */
  const enviar = () => {
    cy.contains('button, input[type="submit"]', 'Finish attempt').click();
    cy.esperarMoodle();
    cy.contains('button, input[type="submit"]', 'Submit all and finish').click();
    cy.get('.modal-dialog').contains('button', 'Submit all and finish').click();
    cy.esperarMoodle();
  };

  /** La ventana previa al intento (contraseña o tiempo límite), que es un diálogo YUI de Moodle. */
  const ventanaPrevia = () => cy.get('.moodle-dialogue-base .moodle-dialogue').filter(':visible');

  /** Escribe la contraseña del cuestionario: el campo se activa al hacer clic en "Click to enter text". */
  const escribirContrasena = (contrasena) => {
    ventanaPrevia().contains('Click to enter text').click();
    cy.focused().type(`${contrasena}{enter}`);
  };

  /** La nota del intento en la revisión, por ejemplo "10.00 out of 10.00". */
  const debeTenerNota = (nota) => {
    cy.contains('th', /^Grade$/).next('td').should('contain', `${nota} out of 10.00`);
  };

  /** El estado de una pregunta en la revisión: "Correct", "Incorrect", "Not answered"... */
  const estadoDe = (tipo) => cy.get(`.que.${tipo} .state`);

  it('MOOD-CP-401 - todo correcto: 10.00 de 10.00', () => {
    prepararYAbrir('MOOD-CP-401');
    pulsar('Attempt quiz');
    responder({ vf: 'True', corta: 'frog', numerica: '3.14' });
    enviar();
    debeTenerNota('10.00');
    cy.contains('th', /^Status$/).next('td').should('contain', 'Finished');
  });

  it('MOOD-CP-402 - respuesta corta parcial (toad): 9.33', () => {
    prepararYAbrir('MOOD-CP-402');
    pulsar('Attempt quiz');
    responder({ vf: 'True', corta: 'toad', numerica: '3.14' });
    enviar();
    debeTenerNota('9.33');
  });

  it('MOOD-CP-403 - todo incorrecto: 0.00', () => {
    prepararYAbrir('MOOD-CP-403');
    pulsar('Attempt quiz');
    responder({ vf: 'False', corta: 'cat', numerica: '3' });
    enviar();
    debeTenerNota('0.00');
  });

  it('MOOD-CP-404 - sin responder: 0.00 y las tres "Not answered"', () => {
    prepararYAbrir('MOOD-CP-404');
    pulsar('Attempt quiz');
    enviar();
    debeTenerNota('0.00');
    cy.get('.que .state').should('have.length', 3).each((estado) => {
      expect(estado.text().trim()).to.eq('Not answered');
    });
  });

  it('MOOD-CP-405 - numérica con tolerancia 0: solo 3.14 y 3.140 son correctas', () => {
    prepararYAbrir('MOOD-CP-405', 'docente');
    const esperado = { '3.139': 'Incorrect', '3.14': 'Correct', '3.140': 'Correct', '3.141': 'Incorrect' };
    Object.entries(esperado).forEach(([respuesta, estado]) => {
      volverAlCuestionario();
      pulsar(/Preview quiz/);
      responder({ numerica: respuesta });
      enviar();
      estadoDe('numerical').should('have.text', estado);
    });
  });

  it('MOOD-CP-406 - la respuesta corta no distingue mayúsculas: FROG es correcta', () => {
    prepararYAbrir('MOOD-CP-406', 'docente');
    pulsar(/Preview quiz/);
    responder({ corta: 'FROG' });
    enviar();
    estadoDe('shortanswer').should('have.text', 'Correct');
  });

  it('MOOD-CP-407 - antes de la apertura no se puede presentar', () => {
    prepararYAbrir('MOOD-CP-407');
    cy.contains('This quiz is currently not available.').should('be.visible');
    cy.contains(/^Opens:/).should('be.visible');
    cy.contains('button, input[type="submit"]', 'Attempt quiz').should('not.exist');
  });

  it('MOOD-CP-408 - después del cierre no se puede presentar', () => {
    prepararYAbrir('MOOD-CP-408');
    cy.contains(/^Closed:/).should('be.visible');
    cy.contains('button, input[type="submit"]', 'Attempt quiz').should('not.exist');
  });

  it('MOOD-CP-409 - el último intento permitido; la nota final es la más alta', () => {
    prepararYAbrir('MOOD-CP-409');
    pulsar('Attempt quiz');
    responder({ vf: 'False', corta: 'cat', numerica: '3' });
    enviar();
    debeTenerNota('0.00');

    volverAlCuestionario();
    pulsar('Re-attempt quiz');
    responder({ vf: 'True', corta: 'frog', numerica: '3.14' });
    enviar();
    debeTenerNota('10.00');

    volverAlCuestionario();
    cy.contains('Your final grade for this quiz is 10.00/10.00.').should('be.visible');
  });

  it('MOOD-CP-410 - sin intentos restantes no se puede presentar otro', () => {
    prepararYAbrir('MOOD-CP-410');
    cy.contains('No more attempts are allowed').should('be.visible');
    cy.contains('button, input[type="submit"]', /Attempt quiz|Re-attempt quiz/).should('not.exist');
  });

  it('MOOD-CP-411 - con la contraseña correcta empieza el intento', () => {
    prepararYAbrir('MOOD-CP-411', 'estudiante.a', { sesionNueva: true });
    cy.contains('To attempt this quiz you need to know the quiz password').should('be.visible');
    pulsar('Attempt quiz');
    cy.then(() => escribirContrasena(datos.contrasenaCuestionario));
    ventanaPrevia().contains('button, input[type="submit"]', 'Start attempt').click();
    cy.esperarMoodle();
    cy.location('pathname').should('eq', '/mod/quiz/attempt.php');
    cy.get('.que').should('have.length', 3);
  });

  it('MOOD-CP-412 - con una contraseña incorrecta no empieza', () => {
    prepararYAbrir('MOOD-CP-412', 'estudiante.a', { sesionNueva: true });
    pulsar('Attempt quiz');
    escribirContrasena('Quiz-2025');
    ventanaPrevia().contains('button, input[type="submit"]', 'Start attempt').click();
    cy.contains('The password entered was incorrect').should('be.visible');
    cy.location('pathname').should('not.eq', '/mod/quiz/attempt.php');
  });

  it('MOOD-CP-413 - un intento a medias se puede continuar con lo respondido', () => {
    prepararYAbrir('MOOD-CP-413');
    pulsar('Attempt quiz');
    responder({ vf: 'True' });
    // Moodle guarda las respuestas al cambiar de página: se sale con "Finish attempt" y se vuelve.
    cy.contains('button, input[type="submit"]', 'Finish attempt').click();
    cy.esperarMoodle();
    volverAlCuestionario();
    pulsar('Continue your attempt');
    cy.contains('.que.truefalse label', 'True').parent().find('input[type="radio"]').should('be.checked');
  });

  it('MOOD-CP-414 - al agotarse el tiempo, el intento se envía solo', () => {
    prepararYAbrir('MOOD-CP-414');
    pulsar('Attempt quiz');
    ventanaPrevia().should('contain', 'Your attempt will have a time limit of 1 min');
    ventanaPrevia().contains('button, input[type="submit"]', 'Start attempt').click();
    cy.esperarMoodle();
    responder({ vf: 'True' });
    // El temporizador llega a cero y Moodle envía el intento: termina en la revisión.
    cy.location('pathname', { timeout: 120000 }).should('eq', '/mod/quiz/review.php');
    debeTenerNota('3.33');
  });
});
