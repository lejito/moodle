// Interacciones de teclado, con eventos reales de Playwright, para las comprobaciones de
// accesibilidad (WCAG 2.1.1 Teclado, 2.4.3 Orden del foco y 2.4.7 Foco visible).
import { Interaction } from '@serenity-js/core';
import { paginaDe } from './moodle';

/** Lo que identifica al elemento buscado: un selector CSS y, si hace falta, su texto exacto. */
export type Destino = { descripcion: string; selector: string; texto?: string };

/** Pulsa una tecla (Enter, Tab, ArrowRight...). */
export const PulsarLaTecla = (tecla: string) =>
  Interaction.where(`#actor pulsa ${tecla}`, async (actor) => {
    await (await paginaDe(actor)).keyboard.press(tecla);
  });

/** Escribe un texto en el elemento que tiene el foco, tecla por tecla. */
export const EscribirConElTeclado = (texto: string) =>
  Interaction.where(`#actor escribe «${texto}» con el teclado`, async (actor) => {
    await (await paginaDe(actor)).keyboard.type(texto);
  });

/**
 * Pulsa una tecla (Tab o una flecha) hasta que el foco llega al destino, y comprueba que ese foco se
 * ve. Falla si no llega en `maximo` pulsaciones: el destino no se alcanza con el teclado.
 */
export const LlevarElFocoCon = (tecla: string, destino: Destino, maximo = 60) =>
  Interaction.where(`#actor lleva el foco con ${tecla} hasta ${destino.descripcion}`, async (actor) => {
    const pagina = await paginaDe(actor);
    for (let pulsaciones = 0; pulsaciones <= maximo; pulsaciones++) {
      const estado = await pagina.evaluate(({ selector, texto }) => {
        const activo = document.activeElement as HTMLElement | null;
        if (!activo || activo === document.body || !activo.matches(selector)
          || (texto !== undefined && activo.textContent?.trim() !== texto)) {
          return null;
        }
        const estilo = getComputedStyle(activo);
        const contorno = estilo.outlineStyle !== 'none' && parseFloat(estilo.outlineWidth) > 0;
        return { visible: contorno || (estilo.boxShadow !== '' && estilo.boxShadow !== 'none') };
      }, destino);
      if (estado) {
        if (!estado.visible) {
          throw new Error(`El foco llega a ${destino.descripcion}, pero no se ve (WCAG 2.4.7).`);
        }
        return;
      }
      await pagina.keyboard.press(tecla);
    }
    throw new Error(`${destino.descripcion} no se alcanza con ${maximo} pulsaciones de ${tecla} (WCAG 2.1.1).`);
  });
