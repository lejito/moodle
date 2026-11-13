// RF-MOOD-04 · Presentar un cuestionario: tareas y preguntas.
import { Task } from '@serenity-js/core';
import { By, Clear, Click, Enter, PageElement } from '@serenity-js/web';
import { Abrir, Boton, CeldaDe, DireccionDelCaso, EsperarAMoodle, Pulsar } from './moodle';

const RespuestaCorta = PageElement.located(By.css('.que.shortanswer input[type="text"]')).describedAs('la respuesta corta');
const RespuestaNumerica = PageElement.located(By.css('.que.numerical input[type="text"]')).describedAs('la respuesta numérica');
const OpcionVerdaderoOFalso = (opcion: string) =>
  PageElement.located(By.xpath(`//div[contains(@class,"truefalse")]//label[contains(normalize-space(.), "${opcion}")]`))
    .describedAs(`la opción «${opcion}»`);
const ConfirmarEnvio = PageElement.located(
  By.xpath('//div[contains(@class,"modal-dialog")]//button[normalize-space(.)="Submit all and finish"]'),
).describedAs('el botón de confirmar el envío');

/** La página del «Cuestionario de laboratorio». */
export const AbrirElCuestionario = () =>
  Abrir('el cuestionario', DireccionDelCaso('el cuestionario', ({ cuestionario }) => `/mod/quiz/view.php?id=${cuestionario}`));

/** Empieza un intento (o el siguiente). */
export const EmpezarUnIntento = () => Pulsar('Attempt quiz');

/** Responde las tres preguntas. */
export const ResponderLasPreguntas = (verdaderoOFalso: string, corta: string, numerica: string) =>
  Task.where(`#actor responde «${verdaderoOFalso}», «${corta}» y «${numerica}»`,
    Click.on(OpcionVerdaderoOFalso(verdaderoOFalso)),
    Clear.theValueOf(RespuestaCorta),
    Enter.theValue(corta).into(RespuestaCorta),
    Clear.theValueOf(RespuestaNumerica),
    Enter.theValue(numerica).into(RespuestaNumerica),
  );

/** El botón de la última página del intento, «Finish attempt ...» (el bloque de navegación tiene otro enlace igual). */
const FinalizarIntento = PageElement.located(By.id('mod_quiz-next-nav')).describedAs('el botón «Finish attempt ...»');

/** Termina el intento: «Finish attempt ...», «Submit all and finish» y la confirmación. */
export const TerminarElIntento = () =>
  Task.where('#actor termina el intento',
    Click.on(FinalizarIntento),
    EsperarAMoodle(),
    Click.on(Boton('Submit all and finish')),
    Click.on(ConfirmarEnvio),
    EsperarAMoodle(),
  );

/** La nota del intento en la revisión, por ejemplo «10.00 out of 10.00 (100%)». */
export const NotaDelIntento = () => CeldaDe('Grade');

/** El botón para empezar un intento, sea el primero o uno nuevo. */
export const BotonDeEmpezar = () => Boton('Attempt quiz');
export const BotonDeReintentar = () => Boton('Re-attempt quiz');
