// RF-MOOD-04 · Presentar un cuestionario: accesibilidad de sus pantallas (WCAG 2.2 A y AA).
//
// Casos MOOD-CP-471 a 474: axe en cada pantalla y reflujo a 320 px. Ana (estudiante.a); el
// cuestionario abierto y sin intentos.
const { debeReajustarseA320, debeTenerSoloBarrerasConocidas } = require('./comun');

describe('RF-MOOD-04 · Presentar un cuestionario (accesibilidad)', () => {
  const prepararYAbrir = (caso) => cy.preparar(caso).then((d) => {
    cy.iniciarSesion('estudiante.a', d.contrasena);
    cy.abrir(`/mod/quiz/view.php?id=${d.cuestionario}`);
  });

  const empezar = () => {
    cy.contains('button, input[type="submit"]', 'Attempt quiz').click();
    cy.esperarMoodle();
    cy.location('pathname').should('eq', '/mod/quiz/attempt.php');
  };

  it('MOOD-CP-471 - página del cuestionario', () => {
    prepararYAbrir('MOOD-CP-471');
    cy.revisarAccesibilidad('MOOD-CP-471', 'Página del cuestionario').then(debeTenerSoloBarrerasConocidas);
  });

  it('MOOD-CP-472 - intento en curso', () => {
    prepararYAbrir('MOOD-CP-472');
    empezar();
    cy.revisarAccesibilidad('MOOD-CP-472', 'Intento en curso').then(debeTenerSoloBarrerasConocidas);
  });

  it('MOOD-CP-473 - revisión del intento', () => {
    prepararYAbrir('MOOD-CP-473');
    empezar();
    cy.contains('.que.truefalse label', 'True').click();
    cy.contains('button, input[type="submit"]', 'Finish attempt').click();
    cy.esperarMoodle();
    cy.contains('button, input[type="submit"]', 'Submit all and finish').click();
    cy.get('.modal-dialog').contains('button', 'Submit all and finish').click();
    cy.esperarMoodle();
    cy.location('pathname').should('eq', '/mod/quiz/review.php');
    cy.revisarAccesibilidad('MOOD-CP-473', 'Revisión del intento').then(debeTenerSoloBarrerasConocidas);
  });

  // Barrera A11Y-03: el campo de la respuesta numérica (size="30") y la fila de navegación no se
  // achican, y la página se desborda 10 px. La prueba falla si el desborde crece.
  it('MOOD-CP-474 - el intento se reajusta a 320 px (salvo la barrera A11Y-03)', () => {
    prepararYAbrir('MOOD-CP-474');
    empezar();
    cy.location('href').then((intento) => debeReajustarseA320(intento, 10));
  });
});
