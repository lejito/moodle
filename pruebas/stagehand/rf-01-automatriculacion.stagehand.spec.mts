// RF-MOOD-01 · Automatricularse con clave, con Stagehand.
//
// observe() encuentra el botón y el campo de la clave y devuelve selectores reales, act() los pulsa
// descritos en lenguaje natural, y extract() lee el curso al que llegó con un esquema de Zod. La
// clave se escribe sin pasar por el modelo. El veredicto lo dan las aserciones exactas.
import { expect, test } from '@playwright/test';
import { z } from 'zod';
import {
  abrir, cargar, cerrar, esperarRuta, iniciarSesion, prepararCaso, requiereClave, rutaActual, type Sesion,
} from './soporte/stagehand.mjs';

test.describe('Stagehand · RF-MOOD-01 · Automatricularse con clave', () => {
  let sesion: Sesion | undefined;

  test.beforeEach(async () => {
    requiereClave();
    sesion = await abrir();
  });

  test.afterEach(async ({}, info) => {
    await cerrar(sesion, info);
    sesion = undefined;
  });

  test('MOOD-CP-191 - se matricula con la clave guiado por lenguaje natural', async () => {
    const { stagehand, pagina } = sesion!;
    const datos = prepararCaso('MOOD-CP-191');
    await iniciarSesion(pagina, 'estudiante.b', datos.contrasena);
    await cargar(pagina, `/enrol/index.php?id=${datos.curso}`);

    // observe(): el modelo identifica el botón para matricularse, y el selector existe de verdad.
    const [boton] = (await stagehand.observe('find the button to enrol myself in this course')).data;
    expect(boton, 'el modelo encontró el botón').toBeDefined();
    expect(await pagina.locator(boton!.selector).isVisible()).toBe(true);

    // act(): lo pulsa, y aparece la ventana de la clave.
    expect((await stagehand.act('click the "Enrol me" button')).data.success).toBe(true);
    await pagina.waitForSelector('.modal-dialog input[name="enrolpassword"]', { timeout: 15_000 });
    const [campo] = (await stagehand.observe('find the enrolment key input in the dialog')).data;
    await pagina.locator(campo!.selector).fill(datos.clave);
    expect((await stagehand.act('click the button that confirms the enrolment in the dialog')).data.success).toBe(true);

    // extract(): lee el nombre del curso; la ruta confirma que entró.
    await esperarRuta(pagina, '/course/view.php');
    const { data } = await stagehand.extract(
      'extract the full name of the course shown as the page heading',
      z.object({ curso: z.string().describe('the course full name, as text') }),
    );
    expect(data.curso).toContain('Laboratorio de pruebas de software');
    expect(await rutaActual(pagina)).toBe('/course/view.php');
  });
});
