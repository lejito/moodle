// RF-MOOD-03 · Calificar una entrega, por la API REST.
//
// Casos MOOD-CP-351 a 359. Califica el docente la entrega enviada de estudiante.a (nota máxima
// 100). mod_assign_submit_grading_form es lo que usa el panel de calificación y pasa por la
// validación del formulario; mod_assign_save_grade guarda sin formulario.

describe('RF-MOOD-03 · Calificar una entrega (API)', () => {
  let datos;

  const preparar = (caso) => cy.preparar(caso).then((d) => {
    datos = d;
  });

  const llamar = (usuario, funcion, parametros) => cy.then(() => cy.servicioWeb(datos.tokens[usuario], funcion, parametros));

  /**
   * Califica con el formulario del panel. jsonformdata es el formulario serializado como cadena
   * de consulta y luego como JSON, que es como lo manda la página.
   */
  const calificar = (nota) => cy.then(() => {
    const formulario = new URLSearchParams({
      id: datos.tarea,
      userid: datos.estudiante,
      attemptnumber: -1,
      rownum: 0,
      ajax: 0,
      sendstudentnotifications: 0,
      grade: nota,
    }).toString();
    return llamar('docente', 'mod_assign_submit_grading_form', {
      assignmentid: datos.idTarea,
      userid: datos.estudiante,
      jsonformdata: JSON.stringify(formulario),
    });
  });

  /** La nota guardada de estudiante.a, como número, o null si no tiene (o es -1, "sin nota"). */
  const nota = () => cy.then(() => llamar('docente', 'mod_assign_get_grades', { assignmentids: [datos.idTarea] }))
    .then((respuesta) => {
      const fila = respuesta.assignments[0]?.grades.find((grade) => grade.userid === datos.estudiante);
      const valor = fila ? Number(fila.grade) : -1;
      return valor < 0 ? null : valor;
    });

  const debeRechazarElFormulario = (avisos) => {
    expect(avisos).to.have.length(1);
    expect(avisos[0].warningcode).to.eq('couldnotsavegrade');
    expect(avisos[0].item).to.eq('Form validation failed.');
  };

  it('MOOD-CP-351 - guarda una nota válida', () => {
    preparar('MOOD-CP-351');
    calificar(80).should('deep.eq', []);
    nota().should('eq', 80);
  });

  it('MOOD-CP-352 - guarda las notas límite 0 y 100', () => {
    preparar('MOOD-CP-352');
    calificar(0).should('deep.eq', []);
    nota().should('eq', 0);
    calificar(100).should('deep.eq', []);
    nota().should('eq', 100);
  });

  it('MOOD-CP-353 - rechaza una nota sobre el máximo', () => {
    preparar('MOOD-CP-353');
    calificar('100.01').then(debeRechazarElFormulario);
    nota().should('be.null');
  });

  it('MOOD-CP-354 - rechaza una nota negativa', () => {
    preparar('MOOD-CP-354');
    calificar(-5).then(debeRechazarElFormulario);
    nota().should('be.null');
  });

  it('MOOD-CP-355 - rechaza una nota no numérica', () => {
    preparar('MOOD-CP-355');
    calificar('abc').then(debeRechazarElFormulario);
    nota().should('be.null');
  });

  /**
   * Guarda una nota sin formulario. El comentario de retroalimentación va vacío, como lo manda la
   * página: sin él, Moodle falla aunque plugindata es opcional (hallazgo H-API-04).
   */
  const guardarNota = (usuario, valor) => cy.then(() => llamar(usuario, 'mod_assign_save_grade', {
    assignmentid: datos.idTarea,
    userid: datos.estudiante,
    grade: valor,
    attemptnumber: -1,
    addattempt: 0,
    workflowstate: '',
    applytoall: 0,
    plugindata: { assignfeedbackcomments_editor: { text: '', format: 1 } },
  }));

  it('MOOD-CP-356 - sin formulario, una nota sobre el máximo no se guarda', () => {
    preparar('MOOD-CP-356');
    guardarNota('docente', 50).should('be.null');
    nota().should('eq', 50);
    guardarNota('docente', 150).should('be.null'); // Responde como éxito: hallazgo H-API-03.
    nota().should('eq', 50);
  });

  it('MOOD-CP-357 - una nota bloqueada en el libro no cambia', () => {
    preparar('MOOD-CP-357');
    nota().should('eq', 60);
    calificar(90).should('deep.eq', []);
    nota().should('eq', 60);
  });

  it('MOOD-CP-358 - un estudiante no puede calificar', () => {
    preparar('MOOD-CP-358');
    guardarNota('estudiante.a', 100).then((respuesta) => {
      expect(respuesta.exception).to.match(/required_capability_exception$/);
      expect(respuesta.errorcode).to.eq('nopermissions');
    });
    nota().should('be.null');
  });

  it('MOOD-CP-359 - un estudiante no puede consultar las notas de la tarea', () => {
    preparar('MOOD-CP-359');
    nota().should('eq', 80);
    cy.then(() => llamar('estudiante.a', 'mod_assign_get_grades', { assignmentids: [datos.idTarea] }))
      .then((respuesta) => {
        expect(respuesta.assignments).to.deep.eq([]);
        expect(respuesta.warnings).to.have.length(1);
        expect(respuesta.warnings[0]).to.include({
          warningcode: '1',
          message: 'No access rights in module context',
        });
      });
  });
});
