// RF-MOOD-01 · Automatricularse con clave, por la API REST.
//
// Casos MOOD-CP-151 a 159. Los hace estudiante.b, que la preparación deja sin matricular. Cada caso
// parte del estado sembrado o del de un caso E2E (MISMA_PREPARACION en preparar.php).

describe('RF-MOOD-01 · Automatricularse con clave (API)', () => {
  let datos;

  const preparar = (caso) => cy.preparar(caso).then((d) => {
    datos = d;
  });

  /** Llama a una función como estudiante.b. */
  const llamar = (funcion, parametros) => cy.then(() => cy.servicioWeb(datos.tokens['estudiante.b'], funcion, parametros));

  /** Intenta matricular a estudiante.b en el curso con la clave dada (sin clave si es undefined). */
  const matricular = (clave) => cy.then(() => llamar('enrol_self_enrol_user', { courseid: datos.curso, password: clave }));

  /**
   * Los IDs de los cursos de estudiante.b. core_enrol_get_users_courses solo cuenta las matrículas
   * que empezaron antes del segundo actual (timestart < ahora, en enrol_get_all_users_courses()), así
   * que una recién hecha aparece en el segundo siguiente: se espera ese segundo antes de consultar.
   */
  const cursosDelEstudiante = () => cy.wait(1100, { log: false }).then(() => llamar('core_enrol_get_users_courses', {
    userid: datos.usuarios['estudiante.b'],
  })).then((cursos) => cursos.map((curso) => curso.id));

  /** Comprueba que la matrícula no se hizo, con el aviso dado. */
  const debeRechazar = (respuesta, codigo, mensaje) => {
    expect(respuesta.status, 'matriculado').to.eq(false);
    expect(respuesta.warnings).to.have.length(1);
    expect(respuesta.warnings[0].warningcode).to.eq(codigo);
    if (mensaje) {
      expect(respuesta.warnings[0].message).to.match(mensaje);
    }
    cursosDelEstudiante().should('not.include', datos.curso);
  };

  it('MOOD-CP-151 - el curso ofrece la automatriculación y pide clave', () => {
    preparar('MOOD-CP-151');
    cy.then(() => llamar('core_enrol_get_course_enrolment_methods', { courseid: datos.curso })).then((metodos) => {
      const propio = metodos.find((metodo) => metodo.type === 'self');
      expect(propio, 'método de automatriculación').to.exist;
      expect(propio.id).to.eq(datos.instancia);
      expect(propio.status).to.eq(true);
    });
    cy.then(() => llamar('enrol_self_get_instance_info', { instanceid: datos.instancia })).then((info) => {
      expect(info.enrolpassword).to.eq('Enrolment key');
    });
  });

  it('MOOD-CP-152 - con la clave correcta queda matriculado', () => {
    preparar('MOOD-CP-152');
    cy.then(() => matricular(datos.clave)).then((respuesta) => {
      expect(respuesta).to.deep.eq({ status: true, warnings: [] });
    });
    cursosDelEstudiante().should('include.members', [datos.curso]);
  });

  it('MOOD-CP-153 - con una clave incorrecta no se matricula', () => {
    preparar('MOOD-CP-153');
    matricular('Clave-2025').then((respuesta) => debeRechazar(respuesta, '4', /^Incorrect enrolment key/));
  });

  it('MOOD-CP-154 - sin clave no se matricula', () => {
    preparar('MOOD-CP-154');
    matricular(undefined).then((respuesta) => debeRechazar(respuesta, '4', /^Incorrect enrolment key/));
  });

  it('MOOD-CP-155 - con la pista activada, el aviso da la primera letra', () => {
    preparar('MOOD-CP-155');
    matricular('Clave-2025').then((respuesta) => debeRechazar(respuesta, '3', /it starts with &#039;C&#039;/));
  });

  it('MOOD-CP-156 - con el método deshabilitado responde una excepción', () => {
    preparar('MOOD-CP-156');
    cy.then(() => matricular(datos.clave)).then((respuesta) => {
      expect(respuesta.exception).to.match(/moodle_exception$/);
      expect(respuesta.errorcode).to.eq('canntenrol');
    });
    cursosDelEstudiante().should('not.include', datos.curso);
  });

  it('MOOD-CP-157 - después de la fecha de fin no se matricula', () => {
    preparar('MOOD-CP-157');
    cy.then(() => matricular(datos.clave)).then((respuesta) => {
      debeRechazar(respuesta, '1', /enrolment ended/);
    });
  });

  it('MOOD-CP-158 - fuera de la cohorte permitida no se matricula', () => {
    preparar('MOOD-CP-158');
    cy.then(() => matricular(datos.clave)).then((respuesta) => {
      debeRechazar(respuesta, '1', /Only members of cohort 'Cohorte de laboratorio'/);
    });
  });

  it('MOOD-CP-159 - si ya está matriculado, la segunda vez no hace nada', () => {
    preparar('MOOD-CP-159');
    cy.then(() => matricular(datos.clave)).its('status').should('eq', true);
    cy.then(() => matricular(datos.clave)).then((respuesta) => {
      expect(respuesta.status).to.eq(false);
      expect(respuesta.warnings[0].warningcode).to.eq('1');
    });
    cursosDelEstudiante().then((cursos) => {
      expect(cursos.filter((id) => id === datos.curso)).to.have.length(1);
    });
  });
});
