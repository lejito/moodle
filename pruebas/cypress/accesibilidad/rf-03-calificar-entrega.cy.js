// RF-MOOD-03 · Calificar una entrega: accesibilidad de sus pantallas (WCAG 2.2 A y AA).
//
// Casos MOOD-CP-371 a 373: axe en cada pantalla y reflujo a 320 px. Diana (docente); la entrega de
// Ana enviada y sin nota.
const { debeReajustarseA320, debeTenerSoloBarrerasConocidas } = require('./comun');

describe('RF-MOOD-03 · Calificar una entrega (accesibilidad)', () => {
  const abrirCalificador = (caso) => cy.preparar(caso).then((d) => {
    cy.iniciarSesion('docente', d.contrasena);
    cy.abrir(`/mod/assign/view.php?id=${d.tarea}&action=grader&userid=${d.estudiante}`);
    cy.contains('[data-region="grade-panel"]', 'Grade out of 100', { timeout: 20000 }).should('be.visible');
    cy.esperarMoodle();
  });

  it('MOOD-CP-371 - calificador', () => {
    abrirCalificador('MOOD-CP-371');
    cy.revisarAccesibilidad('MOOD-CP-371', 'Calificador').then(debeTenerSoloBarrerasConocidas);
  });

  it('MOOD-CP-372 - calificador con el error de una nota fuera de rango', () => {
    abrirCalificador('MOOD-CP-372');
    cy.get('[data-region="grade-panel"] input[name="grade"]').clear().type('100.01');
    cy.get('[data-region="grade-actions"] button[name="savechanges"]').click();
    cy.esperarMoodle();
    cy.get('[data-region="grade-panel"]').contains('Grade must be less than or equal to 100.').should('be.visible');
    cy.revisarAccesibilidad('MOOD-CP-372', 'Calificador con error').then(debeTenerSoloBarrerasConocidas);
  });

  it('MOOD-CP-373 - el calificador se reajusta a 320 px', () => {
    cy.preparar('MOOD-CP-373').then((d) => {
      cy.iniciarSesion('docente', d.contrasena);
      debeReajustarseA320(`/mod/assign/view.php?id=${d.tarea}&action=grader&userid=${d.estudiante}`);
    });
  });
});
