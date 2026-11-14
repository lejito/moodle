// Lo común a las pruebas con Stagehand: la clave de Gemini, el navegador, el ritmo de llamadas al
// modelo y la preparación de cada caso.
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { localBrowser, Stagehand, type Page, type StagehandBrowser } from '@browserbasehq/stagehand';
import { chromium } from 'playwright';
import { test, type TestInfo } from '@playwright/test';
import { tomarTurno } from './cuota.mjs';

export const MOODLE_URL = process.env.MOODLE_URL || 'http://localhost:8000';

// Flash-Lite: el cupo gratuito le da 500 consultas al día, y a Flash solo 20, menos de una corrida.
export const MODELO = (process.env.STAGEHAND_MODEL ?? 'google/gemini-3.5-flash-lite') as `google/${string}`;
const CLAVE = process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim();

export interface Sesion {
  navegador: StagehandBrowser;
  stagehand: Stagehand;
  pagina: Page;
}

/** Sin la clave de Gemini no hay nada que correr: la prueba se salta con aviso, no falla. */
export function requiereClave(): void {
  test.skip(!CLAVE, 'Falta GOOGLE_GENERATIVE_AI_API_KEY en pruebas/.env');
}

// Igual que en Cypress y en la suite BDD: PREPARAR trae el comando completo (Jenkins usa docker
// exec); si no está, se usa el servicio web del entorno local.
const preparar = process.env.PREPARAR
  ? process.env.PREPARAR.split(' ')
  : ['docker', 'compose', '-f', path.join(import.meta.dirname, '..', '..', 'docker', 'compose.yml'),
    'exec', '-T', 'web', 'php', 'pruebas/seed/preparar.php'];

/** Deja el sitio como lo pide el caso (pruebas/seed/preparar.php) y devuelve sus datos. */
export function prepararCaso(caso: string): Record<string, any> {
  const salida = execFileSync(preparar[0], [...preparar.slice(1), caso], {
    encoding: 'utf8',
    env: { ...process.env, MSYS_NO_PATHCONV: '1' },
  });
  return JSON.parse(salida.trim().split('\n').pop() as string);
}

/** Stagehand maneja su propio Chrome, no el navegador de Playwright Test. */
export async function abrir(): Promise<Sesion> {
  const navegador = await localBrowser.launch({
    // En Jenkins (imagen de Playwright) no hay Google Chrome: CHROMIUM_DE_PLAYWRIGHT=1 usa el Chromium
    // que trae la imagen. En el equipo se usa el Chrome instalado.
    executablePath: process.env.CHROME_PATH
      || (process.env.CHROMIUM_DE_PLAYWRIGHT ? chromium.executablePath() : undefined),
    headless: !process.env.VER,
    viewport: { width: 1366, height: 900 },
  });
  const stagehand = await Stagehand.create({
    browser: navegador,
    model: { modelName: MODELO, apiKey: CLAVE },
    logging: { level: 'warn' },
  });
  const [pagina] = await navegador.context.pages();
  return { navegador, stagehand: conTurno(stagehand), pagina: pagina! };
}

/** Hace que act, observe y extract tomen turno en el presupuesto compartido de Gemini (cuota.mts). */
function conTurno(stagehand: Stagehand): Stagehand {
  const esperar = <T extends (...args: never[]) => Promise<unknown>>(llamada: T): T =>
    (async (...args: Parameters<T>) => {
      await tomarTurno();
      return llamada(...args);
    }) as T;
  stagehand.act = esperar(stagehand.act.bind(stagehand));
  stagehand.observe = esperar(stagehand.observe.bind(stagehand));
  stagehand.extract = esperar(stagehand.extract.bind(stagehand));
  return stagehand;
}

/** Adjunta al reporte los tokens y el tiempo de inferencia de la prueba, y cierra el navegador. */
export async function cerrar(sesion: Sesion | undefined, info: TestInfo): Promise<void> {
  if (!sesion) {
    return;
  }
  await info.attach('metricas-stagehand.json', {
    body: JSON.stringify(await sesion.stagehand.metrics(), null, 2),
    contentType: 'application/json',
  });
  await sesion.stagehand.close();
  await sesion.navegador.close();
}

/** Abre una página de Moodle y espera a que no tenga JavaScript pendiente. */
export async function cargar(pagina: Page, ruta: string): Promise<void> {
  await pagina.goto(`${MOODLE_URL}${ruta}`);
  await pagina.waitForFunction(
    () => document.readyState === 'complete' && (window as any).M?.util?.pending_js?.length === 0,
    undefined,
    { timeout: 30_000 },
  );
}

/**
 * Inicia sesión escribiendo directamente en el formulario: las credenciales no pasan por el modelo.
 */
export async function iniciarSesion(pagina: Page, usuario: string, contrasena: string): Promise<void> {
  await cargar(pagina, '/login/index.php');
  await pagina.locator('#username').fill(usuario);
  await pagina.locator('#password').fill(contrasena);
  await pagina.locator('#loginbtn').click();
  await pagina.waitForFunction(() => !location.pathname.startsWith('/login/') && document.readyState === 'complete',
    undefined, { timeout: 30_000 });
}

/** La ruta de la página actual, sin la consulta. */
export async function rutaActual(pagina: Page): Promise<string> {
  return new URL(await pagina.url()).pathname;
}

/** Espera, hasta 30 s, a que la página llegue a la ruta dada y termine de cargar. */
export async function esperarRuta(pagina: Page, ruta: string): Promise<void> {
  await pagina.waitForFunction(
    (esperada: string) => location.pathname === esperada && document.readyState === 'complete'
      && (window as any).M?.util?.pending_js?.length === 0,
    ruta,
    { timeout: 30_000 },
  );
}
