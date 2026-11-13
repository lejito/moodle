// Comandos comunes a las pruebas E2E.

/**
 * Deja el sitio como lo necesita el caso (pruebas/seed/preparar.php) y entrega sus datos:
 * curso, clave, contraseña de los usuarios, etc.
 */
Cypress.Commands.add('preparar', (caso) => cy.task('preparar', caso, { timeout: 60000 }));

/**
 * Inicia sesión con el formulario de Moodle. La sesión de cada usuario se reutiliza entre
 * pruebas (cy.session) y se valida antes de usarla.
 */
Cypress.Commands.add('iniciarSesion', (usuario, contrasena) => {
  cy.session(usuario, () => {
    cy.visit('/login/index.php');
    cy.esperarMoodle();
    cy.get('#username').type(usuario);
    cy.get('#password').type(contrasena, { log: false });
    cy.get('#loginbtn').click();
    cy.location('pathname').should('not.include', '/login/');
  }, {
    validate() {
      cy.request({ url: '/user/profile.php', followRedirect: false })
        .its('status').should('eq', 200);
    },
  });
});

/**
 * Espera a que Moodle termine de cargar la página y su JavaScript: lo mismo que esperan sus
 * pruebas Behat (M.util.pending_js vacío). Sin esto, un clic puede llegar antes de que Moodle
 * conecte el botón, como el "Enrol me" que abre la ventana de la clave.
 */
Cypress.Commands.add('esperarMoodle', () => {
  cy.window({ log: false }).should((ventana) => {
    expect(ventana.document.readyState, 'carga de la página').to.eq('complete');
    expect(ventana.M?.util?.pending_js, 'JavaScript pendiente de Moodle').to.have.length(0);
  });
});

/** Abre una página de Moodle y espera a que termine de cargar. */
Cypress.Commands.add('abrir', (url) => {
  cy.visit(url);
  cy.esperarMoodle();
});
