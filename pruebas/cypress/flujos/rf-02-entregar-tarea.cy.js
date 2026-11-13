// RF-MOOD-02 · Entregar una tarea.
//
// Casos de caja negra MOOD-CP-201 a 216 (217 a 219, los límites al segundo, están en PHPUnit).
// Cada caso empieza con preparar.php, que restablece la tarea sembrada sin entregas y aplica la
// preparación del caso. Lo hace estudiante.a, matriculado como estudiante.

const MEGA = 1048576;

describe('RF-MOOD-02 · Entregar una tarea', () => {
  let datos;

  /** Prepara el caso, inicia sesión como estudiante.a y abre la tarea. */
  const prepararYAbrir = (caso) => {
    cy.preparar(caso).then((d) => {
      datos = d;
      cy.iniciarSesion('estudiante.a', d.contrasena);
      cy.abrir(`/mod/assign/view.php?id=${d.tarea}`);
    });
  };

  /** El estado de la entrega, en la tabla "Submission status". */
  const estadoDeLaEntrega = () => cy.contains('th, td', 'Submission status').siblings('td');

  /** Abre el formulario de la entrega ("Add submission" o "Edit submission"). */
  const abrirFormulario = () => {
    cy.contains('button, a', /^(Add|Edit) submission$/).click();
    cy.esperarMoodle();
  };

  /** Escribe el texto en línea (el editor de texto plano que deja la siembra). */
  const escribirTexto = (texto) => {
    cy.get('textarea[name="onlinetext_editor[text]"]').clear();
    if (texto) {
      cy.get('textarea[name="onlinetext_editor[text]"]').type(texto, { delay: 0 });
    }
  };

  /** Guarda el formulario de la entrega. */
  const guardar = () => {
    cy.contains('button, input[type="submit"]', 'Save changes').click();
    cy.esperarMoodle();
  };

  /** Envía para calificar, con la declaración marcada o no, y confirma. */
  const enviarParaCalificar = ({ declaracion = null } = {}) => {
    cy.contains('button, input[type="submit"]', 'Submit assignment').click();
    cy.esperarMoodle();
    if (declaracion) {
      cy.get('input[name="submissionstatement"]').check();
    }
    cy.contains('button, input[type="submit"]', 'Continue').click();
    cy.esperarMoodle();
  };

  /**
   * Un archivo de texto de exactamente `bytes` bytes, generado en memoria y relleno con su nombre.
   * Cada archivo tiene así un contenido distinto: dos archivos iguales subidos casi a la vez chocan
   * en Moodle al crear la misma carpeta del almacén de archivos («Cannot create local file pool
   * directories»).
   */
  const archivo = (nombre, bytes) => ({
    contents: Cypress.Buffer.alloc(bytes, nombre),
    fileName: nombre,
    mimeType: 'text/plain',
  });

  /** Arrastra un archivo al gestor de archivos de la entrega. */
  const subir = (unArchivo) => {
    cy.get('.filemanager .filemanager-container').first()
      .selectFile(unArchivo, { action: 'drag-drop', force: true });
  };

  /** Una frase de `n` palabras. */
  const palabras = (n) => Array.from({ length: n }, (_, i) => `palabra${i + 1}`).join(' ');

  it('MOOD-CP-201 - entrega un texto en línea: borrador y luego enviada para calificar', () => {
    prepararYAbrir('MOOD-CP-201');
    estadoDeLaEntrega().should('contain', 'No submission');
    abrirFormulario();
    escribirTexto('Entrega del laboratorio de pruebas');
    guardar();
    estadoDeLaEntrega().should('contain', 'Draft (not submitted)');

    enviarParaCalificar();
    estadoDeLaEntrega().should('contain', 'Submitted for grading');
    cy.contains('Entrega del laboratorio de pruebas').should('exist');
    cy.contains('button, a', 'Edit submission').should('not.exist');
  });

  it('MOOD-CP-202 - guardar sin contenido no crea la entrega', () => {
    prepararYAbrir('MOOD-CP-202');
    abrirFormulario();
    escribirTexto('');
    guardar();
    cy.contains('Nothing was submitted').should('be.visible');
    cy.then(() => cy.abrir(`/mod/assign/view.php?id=${datos.tarea}`));
    estadoDeLaEntrega().should('contain', 'No submission');
  });

  it('MOOD-CP-203 - con límite de 10 palabras, guarda un texto de 10', () => {
    prepararYAbrir('MOOD-CP-203');
    abrirFormulario();
    escribirTexto(palabras(10));
    guardar();
    estadoDeLaEntrega().should('contain', 'Draft (not submitted)');
    cy.contains('th, td', 'Online text').siblings('td').should('contain', palabras(10));
  });

  it('MOOD-CP-204 - con límite de 10 palabras, rechaza un texto de 11', () => {
    prepararYAbrir('MOOD-CP-204');
    abrirFormulario();
    escribirTexto(palabras(11));
    guardar();
    cy.contains('The word limit for this assignment is 10 words and you are attempting to submit 11 words.')
      .should('be.visible');
    cy.then(() => cy.abrir(`/mod/assign/view.php?id=${datos.tarea}`));
    estadoDeLaEntrega().should('contain', 'No submission');
  });

  it('MOOD-CP-205 - guarda el máximo de 2 archivos', () => {
    prepararYAbrir('MOOD-CP-205');
    abrirFormulario();
    subir(archivo('primero.txt', 100));
    cy.get('.filemanager').should('contain', 'primero.txt');
    subir(archivo('segundo.txt', 100));
    cy.get('.filemanager').should('contain', 'segundo.txt');
    guardar();
    estadoDeLaEntrega().should('contain', 'Draft (not submitted)');
    cy.contains('a', 'primero.txt').should('exist');
    cy.contains('a', 'segundo.txt').should('exist');
  });

  it('MOOD-CP-206 - no deja agregar un tercer archivo', () => {
    prepararYAbrir('MOOD-CP-206');
    abrirFormulario();
    subir(archivo('primero.txt', 100));
    cy.get('.filemanager').should('contain', 'primero.txt');
    subir(archivo('segundo.txt', 100));
    cy.get('.filemanager').should('contain', 'segundo.txt');
    subir(archivo('tercero.txt', 100));
    cy.get('.filemanager').should('not.contain', 'tercero.txt');
    cy.get('.filemanager .fp-btn-add').should('not.be.visible');
  });

  it('MOOD-CP-207 - acepta un archivo de exactamente 1 MB', () => {
    prepararYAbrir('MOOD-CP-207');
    abrirFormulario();
    subir(archivo('un-mega.txt', MEGA));
    cy.get('.filemanager').should('contain', 'un-mega.txt');
    guardar();
    cy.contains('a', 'un-mega.txt').should('exist');
  });

  it('MOOD-CP-208 - rechaza un archivo de 1 MB más un byte', () => {
    prepararYAbrir('MOOD-CP-208');
    abrirFormulario();
    subir(archivo('un-mega-y-un-byte.txt', MEGA + 1));
    cy.contains(/too large/i).should('be.visible');
    cy.get('.filemanager .fp-content').should('not.contain', 'un-mega-y-un-byte.txt');
  });

  it('MOOD-CP-209 - antes de la apertura no se puede entregar', () => {
    prepararYAbrir('MOOD-CP-209');
    cy.contains('button, a', /^Add submission$/).should('not.exist');
    cy.contains(/Opens:/).should('exist');
  });

  it('MOOD-CP-210 - después del vencimiento la entrega se acepta como tardía', () => {
    prepararYAbrir('MOOD-CP-210');
    abrirFormulario();
    escribirTexto('Entrega tardía');
    guardar();
    enviarParaCalificar();
    estadoDeLaEntrega().should('contain', 'Submitted for grading');
    cy.contains(/Assignment was submitted .* late/).should('exist');
  });

  it('MOOD-CP-211 - después del corte no se puede entregar', () => {
    prepararYAbrir('MOOD-CP-211');
    cy.contains('button, a', /^Add submission$/).should('not.exist');
  });

  it('MOOD-CP-212 - con prórroga se puede entregar después del corte', () => {
    prepararYAbrir('MOOD-CP-212');
    abrirFormulario();
    escribirTexto('Entrega con prórroga');
    guardar();
    estadoDeLaEntrega().should('contain', 'Draft (not submitted)');
  });

  it('MOOD-CP-213 - una entrega enviada ya no se puede editar', () => {
    prepararYAbrir('MOOD-CP-213');
    estadoDeLaEntrega().should('contain', 'Submitted for grading');
    cy.contains('button, a', 'Edit submission').should('not.exist');
  });

  it('MOOD-CP-214 - una entrega bloqueada por el docente no se puede editar', () => {
    prepararYAbrir('MOOD-CP-214');
    estadoDeLaEntrega().should('contain', 'Draft (not submitted)');
    cy.contains('button, a', 'Edit submission').should('not.exist');
    cy.contains('This assignment is not accepting submissions').should('exist');
  });

  it('MOOD-CP-215 - sin aceptar la declaración no se puede enviar', () => {
    prepararYAbrir('MOOD-CP-215');
    enviarParaCalificar({ declaracion: false });
    cy.contains('You are required to agree to this statement before you can submit.').should('be.visible');
    cy.then(() => cy.abrir(`/mod/assign/view.php?id=${datos.tarea}`));
    estadoDeLaEntrega().should('contain', 'Draft (not submitted)');
  });

  it('MOOD-CP-216 - aceptando la declaración se envía', () => {
    prepararYAbrir('MOOD-CP-216');
    enviarParaCalificar({ declaracion: true });
    estadoDeLaEntrega().should('contain', 'Submitted for grading');
  });
});
