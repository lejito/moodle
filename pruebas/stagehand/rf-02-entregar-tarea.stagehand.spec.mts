// RF-MOOD-02 · Entregar una tarea, con Stagehand.
//
// act() hace todo el flujo descrito en lenguaje natural (abrir el formulario, escribir el texto,
// guardar, enviar y confirmar) y extract() lee el estado de la entrega. El veredicto lo dan las
// aserciones exactas sobre la página.
import { expect, test } from '@playwright/test';
import { z } from 'zod';
import { abrir, cargar, cerrar, iniciarSesion, prepararCaso, requiereClave, type Sesion } from './soporte/stagehand.mjs';

test.describe('Stagehand · RF-MOOD-02 · Entregar una tarea', () => {
  let sesion: Sesion | undefined;

  test.beforeEach(async () => {
    requiereClave();
    sesion = await abrir();
  });

  test.afterEach(async ({}, info) => {
    await cerrar(sesion, info);
    sesion = undefined;
  });

  test('MOOD-CP-291 - entrega un texto y lo envía para calificar con act()', async () => {
    const { stagehand, pagina } = sesion!;
    const datos = prepararCaso('MOOD-CP-291');
    await iniciarSesion(pagina, 'estudiante.a', datos.contrasena);
    await cargar(pagina, `/mod/assign/view.php?id=${datos.tarea}`);

    const pasos = [
      'click the "Add submission" button',
      'type "Entrega hecha con Stagehand" into the online text box',
      'click the "Save changes" button',
      'click the "Submit assignment" button',
      'click the "Continue" button',
    ];
    for (const paso of pasos) {
      const { data } = await stagehand.act(paso);
      expect(data.success, paso).toBe(true);
      await pagina.waitForLoadState('load');
    }

    const { data } = await stagehand.extract(
      'extract the submission status shown in the submission status table',
      z.object({ estado: z.string().describe('the submission status, as text') }),
    );
    expect(data.estado).toContain('Submitted for grading');
    expect(await pagina.locator('body').innerText()).toContain('Entrega hecha con Stagehand');
  });
});
