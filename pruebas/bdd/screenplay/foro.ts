// RF-MOOD-05 · Participar en un foro: tareas y preguntas.
import { Task, Wait } from '@serenity-js/core';
import { isVisible } from '@serenity-js/web';
import { By, Click, Enter, PageElement, PageElements } from '@serenity-js/web';
import { Abrir, DireccionDelCaso, EsperarAMoodle } from './moodle';
import { EscribirConElTeclado, LlevarElFocoCon, PulsarLaTecla } from './teclado';

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

/**
 * Responde al mensaje de la docente usando solo el teclado. Las acciones de cada mensaje son un
 * menubar (role="menubar"): Tab llega a la primera («Permalink») y las flechas recorren las demás.
 */
export const ResponderConElTeclado = (texto: string) =>
  Task.where(`#actor responde «${texto}» usando solo el teclado`,
    LlevarElFocoCon('Tab', { descripcion: 'las acciones del mensaje', selector: '[data-region="post"] [role="menuitem"]' }),
    LlevarElFocoCon('ArrowRight', { descripcion: 'el botón «Reply»', selector: '[role="menuitem"]', texto: 'Reply' }, 10),
    PulsarLaTecla('Enter'),
    Wait.until(TextoDeLaRespuesta, isVisible()),
    LlevarElFocoCon('Tab', { descripcion: 'el texto de la respuesta', selector: 'form[data-content="inpage-reply-form"] textarea' }, 10),
    EscribirConElTeclado(texto),
    LlevarElFocoCon('Tab', {
      descripcion: 'el botón «Post to forum»',
      selector: 'form[data-content="inpage-reply-form"] button',
      texto: 'Post to forum',
    }, 10),
    PulsarLaTecla('Enter'),
    EsperarAMoodle(),
  );

/** Los mensajes del debate. */
export const MensajesDelDebate = () =>
  PageElements.located(By.css('[data-region="post"]')).describedAs('los mensajes del debate');
