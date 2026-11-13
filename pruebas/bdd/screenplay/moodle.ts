// Interacciones, tareas y preguntas comunes a las cinco funcionalidades.
import { type Actor, type Answerable, Duration, Interaction, Masked, Question, Task, Wait } from '@serenity-js/core';
import { equals, isTrue, not } from '@serenity-js/assertions';
import { BrowseTheWebWithPlaywright, type PlaywrightPage } from '@serenity-js/playwright';
import { By, Click, Enter, Navigate, PageElement, Text } from '@serenity-js/web';
import type { Page as PaginaDePlaywright } from 'playwright';
import { datosDelCaso } from '../soporte/caso';
import { USUARIOS } from './elenco';

/** La página de Playwright del actor, para lo que Serenity/JS no trae hecho. */
export async function paginaDe(actor: Actor): Promise<PaginaDePlaywright> {
  const pagina = (await BrowseTheWebWithPlaywright.as(actor as any).currentPage()) as PlaywrightPage;
  return pagina.nativePage();
}

/** Un dato del caso en curso (curso, tarea, debate...), leído cuando el actor lo necesita. */
export const DatoDelCaso = (campo: string) =>
  Question.about(`el dato «${campo}» del caso`, () => datosDelCaso()[campo]);

/** Una dirección armada con los datos del caso en curso, por ejemplo la del curso. */
export const DireccionDelCaso = (descripcion: string, armar: (datos: Record<string, any>) => string) =>
  Question.about(descripcion, () => armar(datosDelCaso()));

/**
 * Espera a que la página termine de cargar y a que Moodle no tenga JavaScript pendiente
 * (M.util.pending_js). Sin esto, un clic puede llegar antes de que el botón tenga su comportamiento.
 */
export const EsperarAMoodle = () =>
  Interaction.where('#actor espera a que Moodle termine de cargar', async (actor) => {
    await (await paginaDe(actor)).waitForFunction(
      () => document.readyState === 'complete' && (window as any).M?.util?.pending_js?.length === 0,
      undefined,
      { timeout: 30_000 },
    );
  });

/** Abre una página de Moodle y espera a que termine de cargar. */
export const Abrir = (descripcion: string, ruta: Answerable<string>) =>
  Task.where(`#actor abre ${descripcion}`, Navigate.to(ruta), EsperarAMoodle());

/** Un botón o enlace cuyo texto (o valor, si es un input) es exactamente ese. */
export const Boton = (texto: string) =>
  PageElement.located(By.xpath(
    `//*[self::button or self::a][normalize-space(.)="${texto}"] | //input[@type="submit"][@value="${texto}"]`,
  )).describedAs(`el botón «${texto}»`);

/** Pulsa un botón y espera a que Moodle responda. */
export const Pulsar = (texto: string) =>
  Task.where(`#actor pulsa «${texto}»`, Click.on(Boton(texto)), EsperarAMoodle());

/** Inicia sesión con el usuario sembrado del actor (ver elenco.ts). */
export const IniciarSesion = () =>
  Task.where('#actor inicia sesión',
    Navigate.to('/login/index.php'),
    Enter.theValue(Question.about('su usuario', (actor) => USUARIOS[actor.name])).into(PageElement.located(By.id('username'))),
    Enter.theValue(Masked.valueOf(DatoDelCaso('contrasena') as Answerable<string>)).into(PageElement.located(By.id('password'))),
    Click.on(PageElement.located(By.id('loginbtn'))),
    Wait.until(RutaActual(), not(equals('/login/index.php'))),
    EsperarAMoodle(),
  );

/** La ruta de la página actual, sin la consulta: /course/view.php. */
export const RutaActual = () =>
  Question.about('la ruta de la página actual', async (actor) => new URL((await paginaDe(actor)).url()).pathname);

/** Si la persona puede leer el texto en pantalla (las copias ocultas no cuentan). */
export const SeVeElTexto = (texto: string | RegExp) =>
  Question.about(`si se ve «${texto}»`, async (actor) => {
    const visibles = (await paginaDe(actor)).getByText(texto).filter({ visible: true });
    return (await visibles.count()) > 0;
  });

/** Espera, hasta 15 s, a que se vea el texto. */
export const DebeVerse = (texto: string | RegExp) =>
  Wait.upTo(Duration.ofSeconds(15)).until(SeVeElTexto(texto), isTrue());

/** El texto de la celda que sigue a la cabecera de una tabla de Moodle («Submission status», «Grade»). */
export const CeldaDe = (cabecera: string) =>
  Text.of(PageElement.located(By.xpath(`//th[normalize-space()="${cabecera}"]/following-sibling::td[1]`))
    .describedAs(`la celda «${cabecera}»`))
    .replaceAll(' ', ' ')
    .trim();

/** Si hay a la vista un elemento con ese selector. */
export const HayVisible = (selector: string) =>
  Question.about(`si hay a la vista «${selector}»`, async (actor) =>
    (await (await paginaDe(actor)).locator(selector).filter({ visible: true }).count()) > 0);
