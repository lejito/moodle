// RF-MOOD-05 · Participar en un foro, con Stagehand.
//
// observe() encuentra la acción de responder del mensaje de la docente y el campo de la respuesta,
// act() abre la respuesta, y extract() lee los mensajes del debate como una lista con su autor. El veredicto lo dan
// las aserciones exactas.
import { expect, test } from '@playwright/test';
import { z } from 'zod';
import { abrir, cargar, cerrar, iniciarSesion, prepararCaso, requiereClave, type Sesion } from './soporte/stagehand.mjs';

test.describe('Stagehand · RF-MOOD-05 · Participar en un foro', () => {
  let sesion: Sesion | undefined;

  test.beforeEach(async () => {
    requiereClave();
    sesion = await abrir();
  });

  test.afterEach(async ({}, info) => {
    await cerrar(sesion, info);
    sesion = undefined;
  });

  test('MOOD-CP-591 - responde al debate y extract() lo lee en la lista de mensajes', async () => {
    const { stagehand, pagina } = sesion!;
    const datos = prepararCaso('MOOD-CP-591');
    await iniciarSesion(pagina, 'estudiante.a', datos.contrasena);
    await cargar(pagina, `/mod/forum/discuss.php?d=${datos.debate}`);

    const [responder] = (await stagehand.observe('find the "Reply" action of the first post in the discussion')).data;
    expect(responder, 'el modelo encontró la acción de responder').toBeDefined();
    expect(await pagina.locator(responder!.selector).isVisible()).toBe(true);

    expect((await stagehand.act('click the "Reply" action of the first post')).data.success).toBe(true);
    await pagina.waitForSelector('form[data-content="inpage-reply-form"] textarea', { timeout: 15_000 });
    // observe() localiza el campo del texto y se escribe sin pasar por el modelo: act() lo escribía a
    // veces en otro elemento y la respuesta salía vacía.
    const [campo] = (await stagehand.observe('find the text box of the reply form')).data;
    expect(campo, 'el modelo encontró el campo de la respuesta').toBeDefined();
    await pagina.locator(campo!.selector).fill('Respuesta escrita con Stagehand');
    // El botón queda debajo de la barra fija del pie de página: el clic por coordenadas de act() cae en
    // la barra. observe() lo encuentra y se le envía el evento de clic directamente.
    const [publicar] = (await stagehand.observe('find the "Post to forum" button of the reply form')).data;
    expect(publicar, 'el modelo encontró el botón de publicar').toBeDefined();
    await pagina.locator(publicar!.selector).sendClickEvent();
    // La respuesta se agrega al debate sin recargar la página: se espera a que haya dos mensajes.
    await pagina.waitForFunction(() => document.querySelectorAll('[data-region="post"]').length >= 2, undefined,
      { timeout: 20_000 }).catch(async () => {
      throw new Error(`La respuesta no apareció. Página:
${(await pagina.locator('[role="main"]').innerText()).slice(0, 1500)}`);
    });

    const { data } = await stagehand.extract(
      'extract every post in the discussion with its author name and its message text',
      z.object({
        mensajes: z.array(z.object({
          autor: z.string().describe('the author full name, as text'),
          mensaje: z.string().describe('the message text'),
        })),
      }),
    );
    const respuesta = data.mensajes.find((m) => m.mensaje.includes('Respuesta escrita con Stagehand'));
    expect(respuesta, 'la respuesta aparece en el debate').toBeDefined();
    expect(respuesta!.autor).toContain('Ana Estudiante');
    expect(await pagina.locator('[data-region="post"]').count()).toBe(2);
  });
});
