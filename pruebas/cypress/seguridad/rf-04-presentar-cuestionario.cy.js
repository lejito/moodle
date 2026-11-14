// RF-MOOD-04 · Presentar un cuestionario: seguridad (OWASP Top 10:2025, A01 y A05).
//
// Casos MOOD-CP-481 y 482. Ana (estudiante.a). En 481, otro estudiante (apoyo.1) tiene un intento
// terminado.
const { CARGA_XSS } = require('./comun');

describe('RF-MOOD-04 · Presentar un cuestionario (seguridad)', () => {
  let datos;

  const prepararComoAna = (caso) => cy.preparar(caso).then((d) => {
    datos = d;
    cy.iniciarSesion('estudiante.a', d.contrasena);
  });

  it('MOOD-CP-481 - un estudiante no ve la revisión del intento de otro (A01)', () => {
    prepararComoAna('MOOD-CP-481');
    cy.then(() => cy.request({ url: `/mod/quiz/review.php?attempt=${datos.intentoAjeno}`, failOnStatusCode: false }))
      .then((respuesta) => {
        expect(respuesta.body, 'el aviso de que no puede revisarlo').to.match(/You are not allowed to review this attempt/);
        expect(respuesta.body, 'el nombre del otro estudiante').not.to.include('Apoyo 1');
      });
  });

  it('MOOD-CP-482 - una carga de XSS en la respuesta corta se muestra como texto (A05)', () => {
    prepararComoAna('MOOD-CP-482');
    cy.then(() => cy.abrir(`/mod/quiz/view.php?id=${datos.cuestionario}`));
    cy.contains('button, input[type="submit"]', 'Attempt quiz').click();
    cy.esperarMoodle();
    cy.get('.que.shortanswer input[type="text"]').type(CARGA_XSS, { delay: 0, parseSpecialCharSequences: false });
    cy.contains('button, input[type="submit"]', 'Finish attempt').click();
    cy.esperarMoodle();
    cy.contains('button, input[type="submit"]', 'Submit all and finish').click();
    cy.get('.modal-dialog').contains('button', 'Submit all and finish').click();
    cy.esperarMoodle();
    cy.location('pathname').should('eq', '/mod/quiz/review.php');
    // La respuesta vuelve tal cual, como valor del campo: texto, no HTML.
    cy.get('.que.shortanswer input[type="text"]').should('have.value', CARGA_XSS);
    cy.window().then((ventana) => {
      expect(ventana.__xss, 'la carga se ejecutó').to.be.undefined;
      expect(ventana.document.querySelectorAll('[onerror*="__xss"]')).to.have.length(0);
    });
  });
});
