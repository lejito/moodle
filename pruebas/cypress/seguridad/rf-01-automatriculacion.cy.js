// RF-MOOD-01 · Automatricularse con clave: seguridad del acceso al sitio (OWASP Top 10:2025, A05 y
// A07).
//
// Casos MOOD-CP-181 a 184. El inicio de sesión y la búsqueda de cursos son la puerta de entrada de
// quien se automatricula.

describe('RF-MOOD-01 · Automatricularse con clave (seguridad)', () => {
  let datos;

  /** Envía el formulario de inicio de sesión con su token y devuelve la página resultante. */
  const intentarEntrar = (usuario, contrasena) => cy.request('/login/index.php').its('body').then((html) => {
    const token = html.match(/name="logintoken" value="([^"]+)"/)[1];
    return cy.request({
      method: 'POST',
      url: '/login/index.php',
      form: true,
      body: { username: usuario, password: contrasena, logintoken: token },
    });
  });

  it('MOOD-CP-181 - un inicio de sesión fallido no revela si el usuario existe (A07)', () => {
    cy.preparar('MOOD-CP-181');
    intentarEntrar('estudiante.b', 'Contraseña-mala').then((existente) => {
      intentarEntrar('nadie.existe', 'Contraseña-mala').then((inexistente) => {
        const mensaje = (html) => html.match(/<div[^>]*(?:alert|loginerror)[^>]*>([\s\S]*?)<\/div>/)?.[1].replace(/<[^>]+>/g, '').trim();
        expect(mensaje(existente.body), 'mensaje con usuario existente').to.match(/Unable to log in/);
        expect(mensaje(inexistente.body), 'mismo mensaje con usuario inexistente').to.eq(mensaje(existente.body));
      });
    });
  });

  it('MOOD-CP-182 - la cookie de sesión no es legible por JavaScript y no viaja entre sitios (A07)', () => {
    cy.preparar('MOOD-CP-182').then((d) => {
      cy.iniciarSesion('estudiante.b', d.contrasena);
    });
    cy.getCookie('MoodleSession').then((cookie) => {
      expect(cookie, 'cookie MoodleSession').to.exist;
      expect(cookie.httpOnly, 'HttpOnly').to.eq(true);
      expect(cookie.sameSite, 'SameSite').to.be.oneOf(['lax', 'strict']);
    });
  });

  it('MOOD-CP-183 - cerrar la sesión invalida la cookie anterior (A07)', () => {
    cy.preparar('MOOD-CP-183').then((d) => {
      datos = d;
      cy.iniciarSesion('estudiante.b', d.contrasena);
    });
    cy.abrir('/my/');
    cy.getCookie('MoodleSession').then((anterior) => {
      cy.window().its('M.cfg.sesskey').then((clave) => {
        cy.request(`/login/logout.php?sesskey=${clave}`);
      });
      // Con la cookie de antes, Moodle ya no reconoce la sesión: manda a iniciar sesión.
      cy.setCookie('MoodleSession', anterior.value);
      cy.request({ url: '/user/profile.php', followRedirect: false }).then((respuesta) => {
        expect(respuesta.status).to.eq(303);
        expect(respuesta.redirectedToUrl).to.match(/\/login\/index\.php/);
      });
    });
  });

  it('MOOD-CP-184 - la búsqueda de cursos no es vulnerable a inyección SQL (A05)', () => {
    cy.preparar('MOOD-CP-184').then((d) => cy.iniciarSesion('estudiante.b', d.contrasena));
    // Sin palabras comunes: la búsqueda es por subcadenas, y «OR» encontraría «Laboratorio» legítimamente.
    const cargas = ["' OR '1'='1", "'; DROP TABLE mdl_course; --", "1' UNION SELECT password FROM mdl_user --", "%' AND 1=1 --"];
    cargas.forEach((carga) => {
      cy.request(`/course/search.php?search=${encodeURIComponent(carga)}`).then((respuesta) => {
        expect(respuesta.status).to.eq(200);
        expect(respuesta.body, 'error de base de datos').not.to.match(/dml_|Error reading from database|syntax error/i);
        expect(respuesta.body, 'la carga no devuelve cursos').to.match(/No courses were found/);
      });
    });
    // La búsqueda legítima sigue funcionando. Moodle resalta la palabra encontrada con una etiqueta,
    // así que se compara el texto sin etiquetas.
    cy.request('/course/search.php?search=laboratorio').its('body')
      .then((html) => expect(html.replace(/<[^>]+>/g, '')).to.include('Laboratorio de pruebas de software'));
  });
});
