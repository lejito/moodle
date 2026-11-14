// RF-MOOD-03 · Calificar una entrega: seguridad (OWASP Top 10:2025, A01).
//
// Casos MOOD-CP-381 y 382. Ana (estudiante.a) intenta ver o sacar lo que solo puede el docente. En
// 381, otro estudiante (apoyo.1) tiene nota 50 (preparación de MOOD-CP-315).
const { debeNegarElAcceso } = require('./comun');

describe('RF-MOOD-03 · Calificar una entrega (seguridad)', () => {
  let datos;

  const prepararComoAna = (caso) => cy.preparar(caso).then((d) => {
    datos = d;
    cy.iniciarSesion('estudiante.a', d.contrasena);
  });

  it('MOOD-CP-381 - un estudiante no ve el informe de notas de otro (A01)', () => {
    prepararComoAna('MOOD-CP-381');
    cy.then(() => cy.request({
      url: `/grade/report/user/index.php?id=${datos.curso}&userid=${datos.apoyo}`,
      failOnStatusCode: false,
    })).then((respuesta) => {
      expect(respuesta.body, 'el nombre del otro estudiante').not.to.include('Apoyo 1');
      expect(respuesta.body, 'la nota del otro estudiante').not.to.match(/>\s*50\.00\s*</);
    });
  });

  it('MOOD-CP-382 - un estudiante no descarga todas las entregas (A01)', () => {
    prepararComoAna('MOOD-CP-382');
    cy.then(() => cy.request({ url: `/mod/assign/view.php?id=${datos.tarea}&action=downloadall`, failOnStatusCode: false }))
      .then((respuesta) => {
        expect(respuesta.headers['content-type'], 'no entrega un ZIP').not.to.match(/zip/);
        debeNegarElAcceso(respuesta);
      });
  });
});
