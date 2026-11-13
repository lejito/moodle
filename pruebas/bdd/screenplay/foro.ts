// RF-MOOD-05 · Participar en un foro: tareas y preguntas.
import { Task, Wait } from '@serenity-js/core';
import { isVisible } from '@serenity-js/web';
import { By, Click, Enter, PageElement, PageElements } from '@serenity-js/web';
import { Abrir, DireccionDelCaso, EsperarAMoodle } from './moodle';

const FormularioDeRespuesta = '//form[@data-content="inpage-reply-form"]';
const TextoDeLaRespuesta = PageElement.located(By.xpath(`${FormularioDeRespuesta}//textarea`)).describedAs('el texto de la respuesta');
const PublicarRespuesta = PageElement.located(By.xpath(`${FormularioDeRespuesta}//button[normalize-space(.)="Post to forum"]`))
  .describedAs('el botón «Post to forum» de la respuesta');

/** Los botones «Reply» de los mensajes del debate. */
export const BotonesResponder = () =>
  PageElements.located(By.xpath('//*[@data-region="post"]//*[self::a or self::button][normalize-space(.)="Reply"]'))
    .describedAs('los botones «Reply»');

/** El «Debate inicial» del foro. */
export const AbrirElDebateInicial = () =>
  Abrir('el debate inicial', DireccionDelCaso('el debate inicial', ({ debate }) => `/mod/forum/discuss.php?d=${debate}`));

/** Responde al mensaje de la docente con la respuesta rápida, dentro del mismo debate. */
export const ResponderAlDebate = (texto: string) =>
  Task.where(`#actor responde «${texto}»`,
    Click.on(BotonesResponder().first()),
    Wait.until(TextoDeLaRespuesta, isVisible()),
    Enter.theValue(texto).into(TextoDeLaRespuesta),
    Click.on(PublicarRespuesta),
    EsperarAMoodle(),
  );

/** Los mensajes del debate. */
export const MensajesDelDebate = () =>
  PageElements.located(By.css('[data-region="post"]')).describedAs('los mensajes del debate');
