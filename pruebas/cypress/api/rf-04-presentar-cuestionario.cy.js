// RF-MOOD-04 · Presentar un cuestionario, por la API REST.
//
// Casos MOOD-CP-451 a 460. Los hace estudiante.a con el cuestionario sembrado: verdadero o falso
// (True), respuesta corta (frog = 1, toad = 0.8) y numérica (3.14), de 1 punto cada una, sobre 10.
// Cada caso parte del estado sembrado o del de un caso E2E (MISMA_PREPARACION en preparar.php).

describe('RF-MOOD-04 · Presentar un cuestionario (API)', () => {
  let datos;

  const preparar = (caso) => cy.preparar(caso).then((d) => {
    datos = d;
  });

  const llamar = (funcion, parametros) => cy.servicioWeb(datos.tokens['estudiante.a'], funcion, parametros);

  /** Empieza un intento, con la contraseña del cuestionario si se da. */
  const empezar = (contrasena) => cy.then(() => llamar('mod_quiz_start_attempt', {
    quizid: datos.idCuestionario,
    preflightdata: contrasena === undefined ? undefined : [{ name: 'quizpassword', value: contrasena }],
  }));

  /**
   * Responde y termina un intento. Lee del HTML de get_attempt_data el nombre de cada campo
   * (q<uso>:<ranura>_answer) y su :sequencecheck, como hace la página antes de enviar.
   * respuestas: { 1: '1' (True), 2: 'frog', 3: '3.14' }, por ranura.
   */
  const responderYTerminar = (intento, respuestas) => llamar('mod_quiz_get_attempt_data', {
    attemptid: intento,
    page: 0,
  }).then(({ questions }) => {
    const campos = [];
    questions.forEach((pregunta) => {
      const prefijo = pregunta.html.match(/name="(q\d+:\d+_):sequencecheck" value="(\d+)"/);
      campos.push({ name: `${prefijo[1]}:sequencecheck`, value: prefijo[2] });
      if (respuestas[pregunta.slot] !== undefined) {
        campos.push({ name: `${prefijo[1]}answer`, value: respuestas[pregunta.slot] });
      }
    });
    return llamar('mod_quiz_process_attempt', { attemptid: intento, finishattempt: 1, data: campos });
  });

  /** Presenta un intento completo y entrega la revisión. */
  const presentar = (respuestas) => empezar().then(({ attempt }) => {
    responderYTerminar(attempt.id, respuestas).its('state').should('eq', 'finished');
    return llamar('mod_quiz_get_attempt_review', { attemptid: attempt.id });
  });

  /** Comprueba que no se pudo empezar, con el aviso dado. */
  const debeImpedirEmpezar = (mensaje) => empezar().then((respuesta) => {
    expect(respuesta.attempt).to.deep.eq([]);
    expect(respuesta.warnings).to.have.length(1);
    expect(respuesta.warnings[0]).to.include({ warningcode: '1', message: mensaje });
  });

  it('MOOD-CP-451 - dentro del horario se puede presentar', () => {
    preparar('MOOD-CP-451');
    cy.then(() => llamar('mod_quiz_get_quiz_access_information', { quizid: datos.idCuestionario }))
      .then((acceso) => {
        expect(acceso.canattempt).to.eq(true);
        expect(acceso.preventaccessreasons).to.deep.eq([]);
        expect(acceso.accessrules).to.deep.eq(['Attempts allowed: 2']);
      });
  });

  it('MOOD-CP-452 - todo correcto: 10 de 10', () => {
    preparar('MOOD-CP-452');
    presentar({ 1: '1', 2: 'frog', 3: '3.14' }).then((revision) => {
      expect(revision.attempt.state).to.eq('finished');
      expect(revision.grade).to.eq(10);
    });
  });

  it('MOOD-CP-453 - respuesta corta parcial (toad): 9.33', () => {
    preparar('MOOD-CP-453');
    presentar({ 1: '1', 2: 'toad', 3: '3.14' }).its('grade').should('be.closeTo', 9.33, 0.005);
  });

  it('MOOD-CP-454 - sin responder: 0', () => {
    preparar('MOOD-CP-454');
    presentar({}).its('grade').should('eq', 0);
  });

  it('MOOD-CP-455 - antes de la apertura no se puede empezar', () => {
    preparar('MOOD-CP-455');
    cy.then(() => llamar('mod_quiz_get_quiz_access_information', { quizid: datos.idCuestionario }))
      .its('preventaccessreasons').should('deep.eq', ['This quiz is currently not available.']);
    debeImpedirEmpezar('This quiz is currently not available.');
  });

  it('MOOD-CP-456 - después del cierre no se puede empezar', () => {
    preparar('MOOD-CP-456');
    debeImpedirEmpezar('This quiz is currently not available.');
  });

  it('MOOD-CP-457 - sin intentos restantes no se puede empezar', () => {
    preparar('MOOD-CP-457');
    debeImpedirEmpezar('No more attempts are allowed');
  });

  it('MOOD-CP-458 - con la contraseña correcta empieza el intento', () => {
    preparar('MOOD-CP-458');
    cy.then(() => empezar(datos.contrasenaCuestionario)).then(({ attempt, warnings }) => {
      expect(warnings).to.deep.eq([]);
      expect(attempt.state).to.eq('inprogress');
    });
  });

  it('MOOD-CP-459 - con una contraseña incorrecta no empieza', () => {
    preparar('MOOD-CP-459');
    empezar('Quiz-2025').then((respuesta) => {
      expect(respuesta.exception).to.match(/moodle_exception$/);
      expect(respuesta.message).to.match(/The password entered was incorrect/);
    });
    cy.then(() => llamar('mod_quiz_get_quiz_access_information', { quizid: datos.idCuestionario }))
      .its('canattempt').should('eq', true);
  });

  it('MOOD-CP-460 - un intento terminado no se vuelve a enviar', () => {
    preparar('MOOD-CP-460');
    empezar().then(({ attempt }) => {
      responderYTerminar(attempt.id, { 1: '1' }).its('state').should('eq', 'finished');
      // Un intento terminado ya no entrega sus preguntas (get_attempt_data): se envía directo.
      llamar('mod_quiz_process_attempt', {
        attemptid: attempt.id,
        finishattempt: 1,
        data: [{ name: `q${attempt.uniqueid}:1_answer`, value: '0' }],
      }).then((respuesta) => {
        expect(respuesta.errorcode).to.eq('attemptalreadyclosed');
      });
      llamar('mod_quiz_get_attempt_review', { attemptid: attempt.id }).its('grade').should('be.closeTo', 3.33, 0.005);
    });
  });
});
