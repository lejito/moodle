// RF-MOOD-02 · Entregar una tarea, por la API REST.
//
// Casos MOOD-CP-251 a 259. Los hace estudiante.a sobre la «Tarea de laboratorio», que usa
// borradores: guardar deja la entrega en draft y "enviar para calificar" la pasa a submitted.
// Cada caso parte del estado sembrado o del de un caso E2E (MISMA_PREPARACION en preparar.php).

describe('RF-MOOD-02 · Entregar una tarea (API)', () => {
  let datos;

  const preparar = (caso) => cy.preparar(caso).then((d) => {
    datos = d;
  });

  const llamar = (funcion, parametros) => cy.then(() => cy.servicioWeb(datos.tokens['estudiante.a'], funcion, parametros));

  /**
   * Guarda una entrega de texto en línea. El área de archivos va vacía (0), como la manda la página:
   * sin ese campo, Moodle falla (hallazgo H-API-04).
   */
  const guardar = (texto) => cy.then(() => llamar('mod_assign_save_submission', {
    assignmentid: datos.idTarea,
    plugindata: {
      onlinetext_editor: { text: texto, format: 1, itemid: 0 },
      files_filemanager: 0,
    },
  }));

  const enviar = (aceptaDeclaracion = false) => cy.then(() => llamar('mod_assign_submit_for_grading', {
    assignmentid: datos.idTarea,
    acceptsubmissionstatement: aceptaDeclaracion,
  }));

  /**
   * La última entrega de estudiante.a: estado y texto. Si la tarea no está abierta y nunca guardó
   * nada, Moodle no devuelve entrega: el estado es entonces "ninguna".
   */
  const entrega = () => cy.then(() => llamar('mod_assign_get_submission_status', { assignid: datos.idTarea }))
    .then((estado) => {
      const envio = estado.lastattempt?.submission;
      const texto = envio?.plugins.find((plugin) => plugin.type === 'onlinetext');
      return {
        estado: envio?.status ?? 'ninguna',
        texto: texto?.editorfields?.[0]?.text ?? '',
      };
    });

  /** Comprueba que no quedó nada guardado: ni texto ni una entrega en borrador o enviada. */
  const debeQuedarSinEntrega = () => entrega().then(({ estado, texto }) => {
    expect(estado).to.be.oneOf(['new', 'ninguna']);
    expect(texto).to.eq('');
  });

  /** Comprueba que la llamada devolvió un único aviso con ese código (y ese texto, si se da). */
  const debeAvisar = (avisos, codigo, texto) => {
    expect(avisos.map((aviso) => aviso.warningcode)).to.include(codigo);
    if (texto) {
      expect(avisos.map((aviso) => aviso.item).join(' ')).to.match(texto);
    }
  };

  it('MOOD-CP-251 - guarda el texto como borrador', () => {
    preparar('MOOD-CP-251');
    guardar('Mi entrega por la API').should('deep.eq', []);
    entrega().should('deep.eq', { estado: 'draft', texto: 'Mi entrega por la API' });
  });

  it('MOOD-CP-252 - envía el borrador para calificar', () => {
    preparar('MOOD-CP-252');
    guardar('Mi entrega por la API').should('deep.eq', []);
    enviar().should('deep.eq', []);
    entrega().its('estado').should('eq', 'submitted');
  });

  it('MOOD-CP-253 - una entrega vacía no se guarda', () => {
    preparar('MOOD-CP-253');
    guardar('').then((avisos) => debeAvisar(avisos, 'couldnotsavesubmission', /Nothing was submitted/));
    debeQuedarSinEntrega();
  });

  it('MOOD-CP-254 - antes de la apertura no se guarda', () => {
    preparar('MOOD-CP-254');
    guardar('Antes de tiempo').then((avisos) => debeAvisar(avisos, 'couldnotsavesubmission'));
    debeQuedarSinEntrega();
  });

  it('MOOD-CP-255 - después del corte no se guarda', () => {
    preparar('MOOD-CP-255');
    guardar('Fuera de tiempo').then((avisos) => debeAvisar(avisos, 'couldnotsavesubmission'));
    debeQuedarSinEntrega();
  });

  it('MOOD-CP-256 - con prórroga se guarda aunque pasó el corte', () => {
    preparar('MOOD-CP-256');
    guardar('Con prórroga').should('deep.eq', []);
    entrega().should('deep.eq', { estado: 'draft', texto: 'Con prórroga' });
  });

  it('MOOD-CP-257 - con más palabras que el límite no se guarda', () => {
    preparar('MOOD-CP-257');
    guardar('uno dos tres cuatro cinco seis siete ocho nueve diez once').then((avisos) => {
      debeAvisar(avisos, 'couldnotsavesubmission', /The word limit for this assignment is 10 words/);
    });
    debeQuedarSinEntrega();
  });

  it('MOOD-CP-258 - una entrega bloqueada no cambia', () => {
    preparar('MOOD-CP-258');
    entrega().its('texto').then((antes) => {
      guardar('Cambio con la entrega bloqueada').then((avisos) => debeAvisar(avisos, 'couldnotsavesubmission'));
      entrega().its('texto').should('eq', antes);
    });
  });

  it('MOOD-CP-259 - sin aceptar la declaración no se envía', () => {
    preparar('MOOD-CP-259');
    enviar(false).then((avisos) => debeAvisar(avisos, 'couldnotsubmitforgrading'));
    entrega().its('estado').should('eq', 'draft');
    enviar(true).should('deep.eq', []);
    entrega().its('estado').should('eq', 'submitted');
  });
});
