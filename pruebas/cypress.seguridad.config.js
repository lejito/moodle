// Suite de seguridad: pruebas funcionales del OWASP Top 10 sobre las cinco funcionalidades
// (cypress/seguridad/): control de acceso, CSRF, XSS, inyección, sesión y subida de archivos. El
// reporte queda en reportes/seguridad/. La configuración común está en cypress/configuracion.js.
module.exports = require('./cypress/configuracion')('seguridad');
