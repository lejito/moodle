// Pruebas con Stagehand (stagehand/): flujos de las funcionalidades automatizados con IA, con act(),
// observe() y extract() sobre Gemini. Playwright Test solo corre las pruebas y escribe los reportes;
// Stagehand abre su propio Chrome. Corren contra el Moodle sembrado, como las demás suites
// (MOODLE_URL y PREPARAR funcionan igual).
//
// Gastan cupo gratuito de Gemini: se corren a mano (npm run stagehand) y en Jenkins solo con el
// parámetro IA. Sin GOOGLE_GENERATIVE_AI_API_KEY (pruebas/.env) se saltan con un aviso.
import { defineConfig } from '@playwright/test';

// Las claves de pruebas/.env, si existe; las variables de entorno ya puestas tienen prioridad.
try {
  process.loadEnvFile('.env');
} catch {
  // Sin .env: se usan las variables de entorno, o las pruebas se saltan.
}

export default defineConfig({
  testDir: 'stagehand',
  testMatch: '*.stagehand.spec.mts',
  workers: 1,
  fullyParallel: false,
  // Las respuestas del modelo varían entre corridas: un reintento distingue una inferencia fallida
  // de un defecto.
  retries: 1,
  timeout: 300_000,
  reporter: [
    ['list'],
    ['junit', { outputFile: 'reportes/stagehand/junit/stagehand.xml' }],
    ['html', { outputFolder: 'reportes/stagehand/html', open: 'never' }],
  ],
});
