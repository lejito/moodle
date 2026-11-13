// Arranque de los escenarios: Serenity/JS, el navegador, el elenco y la preparación de cada caso.
import { rmSync } from 'node:fs';
import { AfterAll, Before, BeforeAll, defineParameterType, setDefaultTimeout } from '@cucumber/cucumber';
import { actorCalled, actorInTheSpotlight, configure, Duration, engage } from '@serenity-js/core';
import { chromium, type Browser } from 'playwright';
import { elenco, USUARIOS } from '../screenplay/elenco';
import { casoDelEscenario, prepararCaso } from './caso';

const MOODLE_URL = process.env.MOODLE_URL || 'http://localhost:8000';
const DATOS_DE_SERENITY = 'reportes/bdd/serenity-json';

// Cada corrida empieza sin los datos de la anterior, que si no se suman al reporte de Serenity BDD.
rmSync(DATOS_DE_SERENITY, { recursive: true, force: true });

// Un intento de cuestionario con tiempo límite espera más de un minuto.
setDefaultTimeout(180_000);

configure({
  crew: [
    '@serenity-js/console-reporter',
    ['@serenity-js/serenity-bdd', { specDirectory: './bdd/features' }],
    ['@serenity-js/web:Photographer', { strategy: 'TakePhotosOfFailures' }],
    ['@serenity-js/core:ArtifactArchiver', { outputDirectory: DATOS_DE_SERENITY }],
  ],
  cueTimeout: Duration.ofSeconds(30),
});

let navegador: Browser;

BeforeAll(async () => {
  navegador = await chromium.launch({ headless: !process.env.VER });
});

// Cada escenario parte del estado de su caso y con un elenco nuevo (sesiones nuevas).
Before(({ pickle }) => {
  const caso = casoDelEscenario(pickle.name);
  if (caso) {
    prepararCaso(caso);
  }
  engage(elenco(navegador, MOODLE_URL));
});

AfterAll(async () => {
  await navegador?.close();
});

defineParameterType({
  name: 'actor',
  regexp: new RegExp(Object.keys(USUARIOS).join('|')),
  transformer: (nombre: string) => actorCalled(nombre),
});

defineParameterType({
  name: 'pronombre',
  regexp: /él|ella/,
  transformer: () => actorInTheSpotlight(),
});
