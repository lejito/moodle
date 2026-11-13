// RF-MOOD-01 · Automatricularse en un curso con clave.
//
// Casos de caja negra MOOD-CP-101 a 117, salvo 112 y 113 (límites al segundo, en PHPUnit). Cada
// caso empieza con preparar.php, que restablece la automatriculación sembrada y aplica la
// preparación del caso. Lo hace estudiante.b, que no está matriculado, salvo que se diga otra cosa.

const CURSO = 'Laboratorio de pruebas de software';
const CLAVE_INCORRECTA = 'Incorrect enrolment key, please try again';

describe('RF-MOOD-01 · Automatricularse en un curso con clave', () => {
  let datos;

  /** Prepara el caso e inicia sesión con el usuario dado. */
  const prepararComo = (caso, usuario = 'estudiante.b') => {
    cy.preparar(caso).then((d) => {
      datos = d;
      cy.iniciarSesion(usuario, d.contrasena);
    });
  };

  /** Abre la página de opciones de matriculación del curso. */
  const abrirMatriculacion = () => cy.then(() => cy.abrir(`/enrol/index.php?id=${datos.curso}`));

  /** Pulsa "Enrol me", escribe la clave en la ventana y la confirma. */
  const matricularseCon = (clave) => {
    cy.get('button[type="submit"][data-instance]').contains('Enrol me').click();
    cy.get('.modal-dialog input[name="enrolpassword"]').should('be.visible');
    if (clave !== '') {
      cy.get('.modal-dialog input[name="enrolpassword"]').type(clave);
    }
    cy.get('.modal-dialog .modal-footer button[data-action="save"]').click();
  };

  /** Comprueba que quedó matriculado: Moodle lo lleva al curso. */
  const debeQuedarMatriculado = () => {
    cy.location('pathname').should('eq', '/course/view.php');
    cy.get('h1').should('contain', CURSO);
  };

  /** Comprueba que la ventana muestra el error y que no quedó matriculado. */
  const debeRechazarLaClave = (mensaje = CLAVE_INCORRECTA) => {
    // En los formularios dinámicos, el id del campo lleva un sufijo al azar.
    cy.get('.modal-dialog [id^="id_error_enrolpassword"]').should('be.visible').and('contain', mensaje);
    abrirMatriculacion();
    cy.location('pathname').should('eq', '/enrol/index.php');
    cy.contains('button', 'Enrol me').should('exist');
  };

  /** Comprueba que la página no ofrece matricularse y muestra el aviso. */
  const debeImpedirMatricularse = (aviso) => {
    cy.contains(aviso).should('be.visible');
    cy.contains('button', 'Enrol me').should('not.exist');
  };

  it('MOOD-CP-101 - se matricula con la clave del curso', () => {
    prepararComo('MOOD-CP-101');
    cy.then(() => cy.abrir(`/course/view.php?id=${datos.curso}`));
    cy.location('pathname').should('eq', '/enrol/index.php');
    cy.then(() => matricularseCon(datos.clave));
    debeQuedarMatriculado();

    // El docente lo ve en Participantes, como estudiante.
    cy.then(() => cy.iniciarSesion('docente', datos.contrasena));
    cy.then(() => cy.abrir(`/user/index.php?id=${datos.curso}`));
    cy.contains('tr', 'Bruno Estudiante').should('contain', 'Student');
  });

  it('MOOD-CP-102 - rechaza una clave incorrecta', () => {
    prepararComo('MOOD-CP-102');
    abrirMatriculacion();
    matricularseCon('Clave-2025');
    debeRechazarLaClave();
  });

  it('MOOD-CP-103 - rechaza la clave vacía', () => {
    prepararComo('MOOD-CP-103');
    abrirMatriculacion();
    matricularseCon('');
    debeRechazarLaClave();
  });

  it('MOOD-CP-104 - distingue mayúsculas en la clave', () => {
    prepararComo('MOOD-CP-104');
    abrirMatriculacion();
    matricularseCon('clave-2026');
    debeRechazarLaClave();
  });

  it('MOOD-CP-105 - rechaza la clave con un espacio al final', () => {
    prepararComo('MOOD-CP-105');
    abrirMatriculacion();
    matricularseCon('Clave-2026 ');
    debeRechazarLaClave();
  });

  it('MOOD-CP-106 - con la pista activada, el error muestra la primera letra', () => {
    prepararComo('MOOD-CP-106');
    abrirMatriculacion();
    matricularseCon('Clave-2025');
    debeRechazarLaClave("Here's a hint - it starts with 'C'");
  });

  it('MOOD-CP-107 - se matricula con la clave de un grupo y queda en el grupo', () => {
    prepararComo('MOOD-CP-107');
    abrirMatriculacion();
    cy.then(() => matricularseCon(datos.claveGrupo));
    debeQuedarMatriculado();

    cy.then(() => cy.iniciarSesion('docente', datos.contrasena));
    cy.then(() => cy.abrir(`/user/index.php?id=${datos.curso}`));
    cy.then(() => cy.contains('tr', 'Bruno Estudiante').should('contain', datos.grupo));
  });

  it('MOOD-CP-108 - si ya está matriculado, entra directo al curso', () => {
    prepararComo('MOOD-CP-108', 'estudiante.a');
    abrirMatriculacion();
    debeQuedarMatriculado();
    cy.get('input[name="enrolpassword"]').should('not.exist');
  });

  it('MOOD-CP-109 - no ofrece matricularse si no admite matrículas nuevas', () => {
    prepararComo('MOOD-CP-109');
    abrirMatriculacion();
    debeImpedirMatricularse('Enrolment is disabled or inactive');
  });

  it('MOOD-CP-110 - no ofrece matricularse si el método está desactivado', () => {
    prepararComo('MOOD-CP-110');
    abrirMatriculacion();
    debeImpedirMatricularse('You cannot enrol yourself in this course.');
  });

  it('MOOD-CP-111 - no ofrece matricularse antes del inicio ni después del fin', () => {
    prepararComo('MOOD-CP-111-inicio');
    abrirMatriculacion();
    debeImpedirMatricularse('You cannot enrol yet; enrolment starts on');

    prepararComo('MOOD-CP-111-fin');
    abrirMatriculacion();
    debeImpedirMatricularse('You cannot enrol any more, since enrolment ended on');
  });

  it('MOOD-CP-114 - se matricula cuando queda un lugar (n - 1)', () => {
    prepararComo('MOOD-CP-114');
    abrirMatriculacion();
    cy.then(() => matricularseCon(datos.clave));
    debeQuedarMatriculado();
  });

  it('MOOD-CP-115 - no ofrece matricularse con el cupo lleno (n)', () => {
    prepararComo('MOOD-CP-115');
    abrirMatriculacion();
    debeImpedirMatricularse('Maximum number of users allowed to self-enrol was already reached.');
  });

  it('MOOD-CP-116 - no ofrece matricularse a quien no es de la cohorte', () => {
    prepararComo('MOOD-CP-116');
    abrirMatriculacion();
    cy.then(() => debeImpedirMatricularse(`Only members of cohort '${datos.cohorte}' can self-enrol.`));
  });

  it('MOOD-CP-117 - se matricula si es de la cohorte', () => {
    prepararComo('MOOD-CP-117');
    abrirMatriculacion();
    cy.then(() => matricularseCon(datos.clave));
    debeQuedarMatriculado();
  });
});
