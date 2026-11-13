// Escenarios Gherkin (bdd/features) con Cucumber y Serenity/JS, sobre el patrón Screenplay
// (bdd/screenplay) y con Playwright como navegador. Corren contra el Moodle sembrado, como las
// suites de Cypress: MOODLE_URL y PREPARAR funcionan igual (bdd/soporte/caso.ts).
//
// Reportes en reportes/bdd/: index.html (el de Cucumber, con cada escenario y sus pasos) y
// junit/bdd.xml para Jenkins. Serenity/JS deja además sus datos en reportes/bdd/serenity-json, de
// los que `npm run bdd:reporte` arma el reporte de Serenity BDD (necesita Java 21).
//
// Las rutas de los .feature las dan los scripts de package.json (bdd, bdd:rf-0N): si también
// estuvieran aquí, Cucumber juntaría las dos listas y correría siempre todos.
const config = {
  requireModule: ['tsx/cjs'],
  require: ['bdd/soporte/*.ts', 'bdd/pasos/*.ts'],
  format: [
    '@serenity-js/cucumber',
    'html:reportes/bdd/index.html',
    'junit:reportes/bdd/junit/bdd.xml',
  ],
  formatOptions: { specDirectory: 'bdd/features' },
  // Un escenario a la vez: todos comparten el mismo Moodle sembrado.
  parallel: 0,
  strict: true,
};

export default config;
