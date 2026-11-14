// Lo común a las pruebas de seguridad.

/**
 * Carga de XSS: si alguna parte llega a ejecutarse, deja una marca en window.__xss. Cubre las tres
 * vías habituales: una etiqueta script, un manejador de evento y un enlace javascript:.
 */
const CARGA_XSS = [
  'Texto con carga',
  '<script>window.__xss = "script"</script>',
  '<img src="x" onerror="window.__xss = \'img\'">',
  '<a href="javascript:window.__xss=\'enlace\'">enlace</a>',
].join(' ');

/** Comprueba que en la página no se ejecutó la carga ni quedó en el HTML en forma ejecutable. */
function debeNeutralizarLaCarga() {
  cy.contains('Texto con carga').should('exist');
  cy.window().then((ventana) => {
    expect(ventana.__xss, 'la carga se ejecutó').to.be.undefined;
    const documento = ventana.document;
    const scripts = [...documento.querySelectorAll('script')].filter((s) => s.textContent.includes('__xss'));
    expect(scripts, 'etiquetas script de la carga').to.have.length(0);
    expect(documento.querySelectorAll('[onerror*="__xss"]'), 'manejadores onerror de la carga').to.have.length(0);
    expect(documento.querySelectorAll('a[href^="javascript:"]'), 'enlaces javascript:').to.have.length(0);
  });
}

/**
 * Comprueba que Moodle rechazó la petición por falta de permiso: la página de error con
 * «nopermissions» o el aviso de que no se puede.
 */
function debeNegarElAcceso(respuesta, mensaje = /do not currently have permissions|nopermission|can't|cannot|not allowed/i) {
  expect(respuesta.body, 'mensaje de acceso denegado').to.match(mensaje);
}

/** El sesskey de la página actual (M.cfg.sesskey), el token de Moodle contra CSRF. */
const sesskey = () => cy.window({ log: false }).its('M.cfg.sesskey');

module.exports = { CARGA_XSS, debeNeutralizarLaCarga, debeNegarElAcceso, sesskey };
