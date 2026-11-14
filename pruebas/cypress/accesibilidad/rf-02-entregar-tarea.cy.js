// RF-MOOD-02 · Entregar una tarea: accesibilidad de sus pantallas (WCAG 2.2 A y AA).
//
// Casos MOOD-CP-271 a 274: axe en cada pantalla y reflujo a 320 px. Ana (estudiante.a); la tarea
// abierta y sin entregas.
const { debeReajustarseA320, debeTenerSoloBarrerasConocidas } = require('./comun');

describe('RF-MOOD-02 · Entregar una tarea (accesibilidad)', () => {
  const prepararYAbrir = (caso) => cy.preparar(caso).then((d) => {
    cy.iniciarSesion('estudiante.a', d.contrasena);
    cy.abrir(`/mod/assign/view.php?id=${d.tarea}`);
  });

  const abrirFormulario = () => {
    cy.contains('button, a', /^(Add|Edit) submission$/).click();
    cy.esperarMoodle();
  };

  it('MOOD-CP-271 - página de la tarea', () => {
    prepararYAbrir('MOOD-CP-271');
    cy.revisarAccesibilidad('MOOD-CP-271', 'Página de la tarea').then(debeTenerSoloBarrerasConocidas);
  });

  it('MOOD-CP-272 - formulario de la entrega', () => {
    prepararYAbrir('MOOD-CP-272');
    abrirFormulario();
    cy.revisarAccesibilidad('MOOD-CP-272', 'Formulario de la entrega').then(debeTenerSoloBarrerasConocidas);
  });

  it('MOOD-CP-273 - aviso de entrega vacía', () => {
    prepararYAbrir('MOOD-CP-273');
    abrirFormulario();
    cy.contains('button, input[type="submit"]', 'Save changes').click();
    cy.esperarMoodle();
    cy.contains('Nothing was submitted').should('be.visible');
    cy.revisarAccesibilidad('MOOD-CP-273', 'Aviso de entrega vacía').then(debeTenerSoloBarrerasConocidas);
  });

  it('MOOD-CP-274 - la página de la tarea se reajusta a 320 px', () => {
    cy.preparar('MOOD-CP-274').then((d) => {
      cy.iniciarSesion('estudiante.a', d.contrasena);
      debeReajustarseA320(`/mod/assign/view.php?id=${d.tarea}`);
    });
  });
});
