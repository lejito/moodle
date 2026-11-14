// Comandos comunes a las pruebas E2E y de API.

/**
 * Deja el sitio como lo necesita el caso (pruebas/seed/preparar.php) y entrega sus datos:
 * curso, clave, contraseña de los usuarios, etc.
 */
Cypress.Commands.add('preparar', (caso) => cy.task('preparar', caso, { timeout: 60000 }));

/**
 * Inicia sesión enviando el formulario de entrada de Moodle con su token (logintoken), sin
 * escribir en la página: el formulario cambia sus campos mientras carga su JavaScript y a veces
 * la contraseña quedaba a medias. Entrar no es parte de ninguna funcionalidad bajo prueba. La
 * sesión de cada usuario se reutiliza entre pruebas (cy.session) y se valida antes de usarla.
 *
 * `sesion` da otro nombre a la sesión, para empezar una nueva: Moodle recuerda cosas en la sesión
 * (por ejemplo, que ya se escribió la contraseña de un cuestionario) que un caso no debe heredar.
 */
Cypress.Commands.add('iniciarSesion', (usuario, contrasena, { sesion = usuario } = {}) => {
  cy.session(sesion, () => {
    cy.request('/login/index.php').its('body').then((html) => {
      const token = html.match(/name="logintoken" value="([^"]+)"/)[1];
      cy.request({
        method: 'POST',
        url: '/login/index.php',
        form: true,
        body: { username: usuario, password: contrasena, logintoken: token },
        // Se sigue la redirección de Moodle tras entrar: consume el destino pendiente de la sesión
        // (wantsurl), que si no se usa después y desvía otras páginas. Si esa página falla, la
        // validación de la sesión lo detecta igual.
        failOnStatusCode: false,
      });
    });
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

/**
 * Aplana los parámetros de una función externa al formato de formulario que espera el servidor
 * REST de Moodle: { datos: [{ nombre: 'x' }] } pasa a { 'datos[0][nombre]': 'x' }.
 */
const aplanar = (valor, prefijo, salida = {}) => {
  if (valor !== null && typeof valor === 'object') {
    Object.entries(valor).forEach(([clave, interno]) => {
      aplanar(interno, prefijo ? `${prefijo}[${clave}]` : clave, salida);
    });
  } else if (valor !== undefined) {
    salida[prefijo] = valor === true ? 1 : valor === false ? 0 : valor;
  }
  return salida;
};

/**
 * Llama a una función externa por el servidor REST (/webservice/rest/server.php), con el token de
 * un usuario, y entrega el cuerpo JSON de la respuesta. Moodle responde siempre con HTTP 200: los
 * errores llegan en el cuerpo, como warnings o como { exception, errorcode, message }.
 */
Cypress.Commands.add('servicioWeb', (token, funcion, parametros = {}) => {
  Cypress.log({ name: 'servicioWeb', message: funcion });
  return cy.request({
    method: 'POST',
    url: '/webservice/rest/server.php',
    form: true,
    log: false,
    body: { wstoken: token, wsfunction: funcion, moodlewsrestformat: 'json', ...aplanar(parametros) },
  }).then((respuesta) => {
    expect(respuesta.status, `HTTP de ${funcion}`).to.eq(200);
    return respuesta.body;
  });
});

/** Las etiquetas de axe-core que se revisan: WCAG 2.0, 2.1 y 2.2, niveles A y AA. */
const ETIQUETAS_WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

/**
 * Revisa la página actual con axe-core y registra lo que encontró (tarea registrarAccesibilidad, que
 * arma reportes/accesibilidad/barreras.html). Entrega las violaciones: { regla, impacto, ... }.
 */
Cypress.Commands.add('revisarAccesibilidad', (caso, pantalla) => {
  cy.esperarMoodle();
  return cy.readFile('node_modules/axe-core/axe.min.js', { log: false }).then((fuente) =>
    cy.window({ log: false }).then({ timeout: 60000 }, (ventana) => {
      if (!ventana.axe) {
        ventana.eval(fuente);
      }
      return ventana.axe.run(ventana.document, {
        runOnly: { type: 'tag', values: ETIQUETAS_WCAG },
        resultTypes: ['violations'],
      }).then((resultado) => ({ ruta: ventana.location.pathname, resultado }));
    })).then(({ ruta, resultado }) => {
    const violaciones = resultado.violations.map((v) => ({
      regla: v.id,
      impacto: v.impact,
      descripcion: v.help,
      ayuda: v.helpUrl,
      etiquetas: v.tags,
      elementos: v.nodes.map((n) => ({ selector: n.target.join(' '), html: n.html.slice(0, 300) })),
    }));
    Cypress.log({
      name: 'accesibilidad',
      message: `${pantalla}: ${violaciones.length ? violaciones.map((v) => `${v.regla} (${v.impacto})`).join(', ') : 'sin violaciones'}`,
    });
    cy.task('registrarAccesibilidad', { caso, pantalla, url: ruta, violaciones }, { log: false });
    return cy.wrap(violaciones, { log: false });
  });
});
