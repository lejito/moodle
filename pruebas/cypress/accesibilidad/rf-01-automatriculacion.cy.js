// RF-MOOD-01 · Automatricularse con clave: accesibilidad de sus pantallas (WCAG 2.2 A y AA).
//
// Casos MOOD-CP-171 a 176: axe en cada pantalla, matricularse solo con el teclado y reflujo a
// 320 px. Bruno (estudiante.b) sin matricular; preparar.php deja el estado sembrado.
const { debeReajustarseA320, debeTenerSoloBarrerasConocidas, tabularHasta } = require('./comun');

describe('RF-MOOD-01 · Automatricularse con clave (accesibilidad)', () => {
  let datos;

  const prepararComoBruno = (caso) => cy.preparar(caso).then((d) => {
    datos = d;
    cy.iniciarSesion('estudiante.b', d.contrasena);
    cy.abrir(`/enrol/index.php?id=${d.curso}`);
  });

  /** Abre la ventana de la clave. */
  const abrirVentanaDeLaClave = () => {
    cy.get('button[type="submit"][data-instance]').contains('Enrol me').click();
    cy.get('.modal-dialog input[name="enrolpassword"]').should('be.visible');
  };

  it('MOOD-CP-171 - inicio de sesión', () => {
    cy.preparar('MOOD-CP-171');
    cy.abrir('/login/index.php');
    cy.revisarAccesibilidad('MOOD-CP-171', 'Inicio de sesión').then(debeTenerSoloBarrerasConocidas);
  });

  it('MOOD-CP-172 - página de matriculación del curso', () => {
    prepararComoBruno('MOOD-CP-172');
    cy.revisarAccesibilidad('MOOD-CP-172', 'Matriculación del curso').then(debeTenerSoloBarrerasConocidas);
  });

  it('MOOD-CP-173 - ventana de la clave abierta', () => {
    prepararComoBruno('MOOD-CP-173');
    abrirVentanaDeLaClave();
    cy.revisarAccesibilidad('MOOD-CP-173', 'Ventana de la clave').then(debeTenerSoloBarrerasConocidas);
  });

  it('MOOD-CP-174 - ventana de la clave con el error de una clave incorrecta', () => {
    prepararComoBruno('MOOD-CP-174');
    abrirVentanaDeLaClave();
    cy.get('.modal-dialog input[name="enrolpassword"]').type('Clave-2025');
    cy.get('.modal-dialog .modal-footer button[data-action="save"]').click();
    cy.get('.modal-dialog [id^="id_error_enrolpassword"]').should('be.visible');
    cy.revisarAccesibilidad('MOOD-CP-174', 'Ventana de la clave con error').then(debeTenerSoloBarrerasConocidas);
  });

  it('MOOD-CP-175 - se matricula solo con el teclado', () => {
    prepararComoBruno('MOOD-CP-175');
    tabularHasta('el botón «Enrol me»', (e) => e.matches('button[type="submit"][data-instance]'));
    // Espacio activa un botón. (cy.press no manda el carácter de Enter, que es lo que activa los
    // botones nativos; en un navegador real, Enter también sirve.)
    cy.press(Cypress.Keyboard.Keys.SPACE);
    // Al abrirse la ventana, el foco entra en ella (WCAG 2.4.3, orden del foco).
    cy.get('.modal-dialog input[name="enrolpassword"]').should('be.visible');
    cy.focused().should((foco) => expect(foco.closest('.modal-dialog'), 'el foco está en la ventana').to.have.length(1));
    tabularHasta('el campo de la clave', (e) => e.matches('input[name="enrolpassword"]'), 10);
    cy.focused().type(`${datos.clave}{enter}`);
    cy.location('pathname').should('eq', '/course/view.php');
  });

  it('MOOD-CP-176 - la matriculación se reajusta a 320 px', () => {
    cy.preparar('MOOD-CP-176').then((d) => {
      cy.iniciarSesion('estudiante.b', d.contrasena);
      debeReajustarseA320(`/enrol/index.php?id=${d.curso}`);
    });
  });
});
