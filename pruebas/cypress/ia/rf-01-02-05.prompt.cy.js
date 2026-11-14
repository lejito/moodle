// cy.prompt sobre RF-MOOD-01, RF-MOOD-02 y RF-MOOD-05.
//
// La interacción va en lenguaje natural y Cypress Cloud la convierte en comandos de Cypress, que
// guarda en caché hasta que la página cambia. Los pasos están en inglés, el idioma para el que está
// ajustado, y citan los textos de Moodle tal como se ven. El veredicto nunca sale del modelo: cada caso
// termina en aserciones exactas. La clave de matriculación viaja como placeholder, fuera de las
// llamadas a la IA. Cada caso parte del estado que le deja preparar.php.

describe('IA · cy.prompt sobre RF-MOOD-01, 02 y 05', () => {
  it('MOOD-CP-195 - se matricula con la clave escrita en lenguaje natural (RF-MOOD-01)', () => {
    cy.preparar('MOOD-CP-195').then((datos) => {
      cy.iniciarSesion('estudiante.b', datos.contrasena);
      cy.abrir(`/enrol/index.php?id=${datos.curso}`);
      cy.prompt(
        [
          'click the "Enrol me" button',
          'type {{clave}} in the "Enrolment key" field of the dialog',
          'click the "Enrol me" button of the dialog',
        ],
        { placeholders: { clave: datos.clave } },
      );
    });
    cy.location('pathname', { timeout: 20000 }).should('eq', '/course/view.php');
    cy.get('h1').should('contain', 'Laboratorio de pruebas de software');
  });

  it('MOOD-CP-295 - entrega un texto y lo envía para calificar (RF-MOOD-02)', () => {
    cy.preparar('MOOD-CP-295').then((datos) => {
      cy.iniciarSesion('estudiante.a', datos.contrasena);
      cy.abrir(`/mod/assign/view.php?id=${datos.tarea}`);
    });
    cy.prompt([
      'click the "Add submission" button',
      'type "Entrega escrita con cy.prompt" in the "Online text" text area',
      'click the "Save changes" button',
    ]);
    cy.esperarMoodle();
    cy.prompt([
      'click the "Submit assignment" button',
      'click the "Continue" button',
    ]);
    cy.esperarMoodle();
    cy.contains('th, td', 'Submission status').siblings('td').should('contain', 'Submitted for grading');
    cy.contains('Entrega escrita con cy.prompt').should('exist');
  });

  it('MOOD-CP-595 - responde al debate de la docente (RF-MOOD-05)', () => {
    cy.preparar('MOOD-CP-595').then((datos) => {
      cy.iniciarSesion('estudiante.a', datos.contrasena);
      cy.abrir(`/mod/forum/discuss.php?d=${datos.debate}`);
    });
    cy.prompt([
      'click the "Reply" link of the first post',
      'type "Respuesta escrita con cy.prompt" in the reply text area',
      'click the "Post to forum" button of the reply form',
    ]);
    cy.contains('[data-region="post"]', 'Respuesta escrita con cy.prompt', { timeout: 20000 })
      .should('contain', 'Ana Estudiante');
    cy.get('[data-region="post"]').should('have.length', 2);
  });
});
