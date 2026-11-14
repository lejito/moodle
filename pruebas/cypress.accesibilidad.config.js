// Suite de accesibilidad: axe-core (WCAG 2.2, niveles A y AA) sobre las pantallas de las cinco
// funcionalidades, más comprobaciones de teclado y de reflujo (cypress/accesibilidad/), con el
// reporte en reportes/accesibilidad/. La configuración común está en cypress/configuracion.js.
module.exports = require('./cypress/configuracion')('accesibilidad');
