// Configuración de Cypress para las pruebas E2E del proyecto.
//
// Corre contra el Moodle sembrado: el entorno local (pruebas/docker, http://localhost:8000) o el
// que despliega Jenkins. Antes de cada caso, la tarea "preparar" ejecuta pruebas/seed/preparar.php
// dentro del contenedor de Moodle, que deja el sitio como lo pide el caso y devuelve sus datos.
//
// Variables de entorno:
//   MOODLE_URL   dirección de Moodle (la de $CFG->wwwroot); por defecto http://localhost:8000
//   PREPARAR     comando que ejecuta preparar.php, sin el caso; por defecto, en el servicio web
//                del entorno local (docker compose exec)
//
// Los reportes quedan en pruebas/reportes/e2e/: index.html con cada prueba (y la captura de las
// que fallan) y junit/ para Jenkins.
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { defineConfig } = require('cypress');

const preparar = process.env.PREPARAR
  ? process.env.PREPARAR.split(' ')
  : ['docker', 'compose', '-f', path.join(__dirname, 'docker', 'compose.yml'),
    'exec', '-T', 'web', 'php', 'pruebas/seed/preparar.php'];

module.exports = defineConfig({
  reporter: 'cypress-multi-reporters',
  reporterOptions: {
    reporterEnabled: 'spec, cypress-mochawesome-reporter, mocha-junit-reporter',
    cypressMochawesomeReporterReporterOptions: {
      reportDir: 'reportes/e2e',
      reportPageTitle: 'Pruebas E2E',
      charts: true,
      embeddedScreenshots: true,
      inlineAssets: true,
      saveAllAttempts: false,
    },
    mochaJunitReporterReporterOptions: {
      mochaFile: 'reportes/e2e/junit/[hash].xml',
      testCaseSwitchClassnameAndName: false,
    },
  },
  screenshotsFolder: 'reportes/e2e/capturas',
  downloadsFolder: 'reportes/e2e/descargas',
  video: false,
  viewportWidth: 1366,
  viewportHeight: 900,
  defaultCommandTimeout: 10000,
  e2e: {
    baseUrl: process.env.MOODLE_URL || 'http://localhost:8000',
    specPattern: 'cypress/flujos/**/*.cy.js',
    supportFile: 'cypress/support/e2e.js',
    setupNodeEvents(on, config) {
      require('cypress-mochawesome-reporter/plugin')(on);
      on('task', {
        // Deja el sitio listo para el caso y devuelve el JSON de la última línea de preparar.php.
        preparar(caso) {
          const salida = execFileSync(preparar[0], [...preparar.slice(1), caso], { encoding: 'utf8' });
          return JSON.parse(salida.trim().split('\n').pop());
        },
      });
      return config;
    },
  },
});
