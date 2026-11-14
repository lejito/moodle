// RF-MOOD-02 · Entregar una tarea: seguridad (OWASP Top 10:2025, A01, A05 y A06).
//
// Casos MOOD-CP-281 a 284. Ana (estudiante.a) entrega; Diana (docente) revisa.
const { CARGA_XSS, debeNegarElAcceso, debeNeutralizarLaCarga } = require('./comun');

describe('RF-MOOD-02 · Entregar una tarea (seguridad)', () => {
  let datos;

  const preparar = (caso, usuario = 'estudiante.a') => cy.preparar(caso).then((d) => {
    datos = d;
    cy.iniciarSesion(usuario, d.contrasena);
  });

  /** Guarda una entrega de texto de Ana por la API, sin pasar por el formulario. */
  const guardarTextoPorApi = (texto) => cy.then(() => cy.servicioWeb(datos.tokens['estudiante.a'], 'mod_assign_save_submission', {
    assignmentid: datos.idTarea,
    plugindata: { onlinetext_editor: { text: texto, format: 1, itemid: 0 }, files_filemanager: 0 },
  })).should('deep.eq', []);

  /** El estado de la entrega de Ana, por la API ("ninguna" si no hay entrega guardada). */
  const estadoDeLaEntrega = () => cy.then(() => cy.servicioWeb(datos.tokens['estudiante.a'], 'mod_assign_get_submission_status', {
    assignid: datos.idTarea,
  })).then((estado) => estado.lastattempt?.submission?.status ?? 'ninguna');

  it('MOOD-CP-281 - un estudiante no abre la tabla de calificación de la tarea (A01)', () => {
    preparar('MOOD-CP-281');
    cy.then(() => cy.request({ url: `/mod/assign/view.php?id=${datos.tarea}&action=grading`, failOnStatusCode: false }))
      .then((respuesta) => debeNegarElAcceso(respuesta));
  });

  it('MOOD-CP-282 - un archivo de un tipo no permitido no se sube (A06)', () => {
    preparar('MOOD-CP-282');
    cy.then(() => cy.abrir(`/mod/assign/view.php?id=${datos.tarea}`));
    cy.contains('button, a', /^Add submission$/).click();
    cy.esperarMoodle();
    cy.intercept('POST', '**/repository/repository_ajax.php?action=upload*').as('subida');
    cy.get('.filemanager .filemanager-container').first().selectFile({
      contents: Cypress.Buffer.from('<?php echo "hola"; ?>'),
      fileName: 'malicioso.php',
      mimeType: 'application/x-php',
    }, { action: 'drag-drop', force: true });
    // El archivo llega al área de borrador del usuario, que es temporal: el control de tipos se hace
    // en el servidor al guardar la entrega.
    cy.wait('@subida');
    cy.contains('button, input[type="submit"]', 'Save changes').click();
    cy.esperarMoodle();
    cy.contains('Some files (malicioso.php) cannot be uploaded. Only file types').should('be.visible');
    estadoDeLaEntrega().should('not.be.oneOf', ['draft', 'submitted']);
  });

  it('MOOD-CP-283 - una carga de XSS en el texto en línea no se ejecuta, ni para el docente (A05)', () => {
    preparar('MOOD-CP-283');
    guardarTextoPorApi(CARGA_XSS);
    cy.then(() => cy.abrir(`/mod/assign/view.php?id=${datos.tarea}`));
    debeNeutralizarLaCarga();
    cy.then(() => cy.iniciarSesion('docente', datos.contrasena));
    cy.then(() => cy.abrir(`/mod/assign/view.php?id=${datos.tarea}&action=grading`));
    debeNeutralizarLaCarga();
  });

  it('MOOD-CP-284 - enviar para calificar sin el sesskey válido se rechaza (A01, CSRF)', () => {
    preparar('MOOD-CP-284');
    guardarTextoPorApi('Borrador de Ana');
    estadoDeLaEntrega().should('eq', 'draft');
    cy.then(() => cy.request({
      method: 'POST',
      url: '/mod/assign/view.php',
      form: true,
      failOnStatusCode: false,
      body: { id: datos.tarea, action: 'confirmsubmit', sesskey: 'sesskey-falso' },
    })).its('body').should('match', /session has most likely timed out|invalidsesskey/);
    estadoDeLaEntrega().should('eq', 'draft');
  });
});
