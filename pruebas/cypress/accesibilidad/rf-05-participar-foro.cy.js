// RF-MOOD-05 · Participar en un foro: accesibilidad de sus pantallas (WCAG 2.2 A y AA).
//
// Casos MOOD-CP-571 a 575: axe en cada pantalla y reflujo a 320 px. Ana (estudiante.a); el foro con
// solo el debate inicial de Diana. Responder solo con el teclado (MOOD-CP-576) está en la suite BDD
// (bdd/features/rf-05-participar-foro.feature): el botón «Reply» se activa con el clic que genera
// un Enter real, y eso Cypress no lo reproduce; Playwright sí.
const { debeReajustarseA320, debeTenerSoloBarrerasConocidas } = require('./comun');

describe('RF-MOOD-05 · Participar en un foro (accesibilidad)', () => {
  const prepararComoAna = (caso, ruta) => cy.preparar(caso).then((d) => {
    cy.iniciarSesion('estudiante.a', d.contrasena);
    cy.abrir(ruta(d));
  });

  const abrirRespuestaRapida = () => {
    cy.get('[data-region="post"]').find('a, button').filter(':contains("Reply")').first().click();
    cy.get('form[data-content="inpage-reply-form"] textarea').should('be.visible');
  };

  it('MOOD-CP-571 - lista de debates del foro', () => {
    prepararComoAna('MOOD-CP-571', (d) => `/mod/forum/view.php?id=${d.foro}`);
    cy.revisarAccesibilidad('MOOD-CP-571', 'Lista de debates').then(debeTenerSoloBarrerasConocidas);
  });

  it('MOOD-CP-572 - debate', () => {
    prepararComoAna('MOOD-CP-572', (d) => `/mod/forum/discuss.php?d=${d.debate}`);
    cy.revisarAccesibilidad('MOOD-CP-572', 'Debate').then(debeTenerSoloBarrerasConocidas);
  });

  it('MOOD-CP-573 - respuesta rápida abierta', () => {
    prepararComoAna('MOOD-CP-573', (d) => `/mod/forum/discuss.php?d=${d.debate}`);
    abrirRespuestaRapida();
    cy.revisarAccesibilidad('MOOD-CP-573', 'Respuesta rápida').then(debeTenerSoloBarrerasConocidas);
  });

  it('MOOD-CP-574 - formulario completo con el error de un mensaje vacío', () => {
    prepararComoAna('MOOD-CP-574', (d) => `/mod/forum/discuss.php?d=${d.debate}`);
    abrirRespuestaRapida();
    cy.get('form[data-content="inpage-reply-form"]').contains('button, a', 'Advanced').click();
    cy.esperarMoodle();
    cy.get('textarea[name="message[text]"]').clear();
    cy.contains('button, input[type="submit"]', 'Post to forum').click();
    cy.esperarMoodle();
    cy.contains(/Required|Post message cannot be empty/).should('be.visible');
    cy.revisarAccesibilidad('MOOD-CP-574', 'Formulario completo con error').then(debeTenerSoloBarrerasConocidas);
  });

  it('MOOD-CP-575 - el debate se reajusta a 320 px', () => {
    cy.preparar('MOOD-CP-575').then((d) => {
      cy.iniciarSesion('estudiante.a', d.contrasena);
      debeReajustarseA320(`/mod/forum/discuss.php?d=${d.debate}`);
    });
  });
});
