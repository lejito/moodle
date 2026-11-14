// Suite con IA de Cypress: cy.prompt (cypress/ia/). Los pasos van en lenguaje natural y Cypress Cloud
// los convierte en comandos, así que necesita CYPRESS_PROJECT_ID y CYPRESS_RECORD_KEY (pruebas/.env),
// corre con --record y solo en Chrome. El veredicto nunca sale del modelo: cada caso termina en
// aserciones exactas. El reporte queda en reportes/ia/ y la grabación en Cypress Cloud.
// La configuración común está en cypress/configuracion.js.
module.exports = require('./cypress/configuracion')('ia');
