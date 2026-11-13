// RF-MOOD-03 · Calificar una entrega: tareas y preguntas.
import { Duration, Task, Wait } from '@serenity-js/core';
import { includes } from '@serenity-js/assertions';
import { By, Click, Clear, Enter, PageElement, Text } from '@serenity-js/web';
import { Abrir, DireccionDelCaso, EsperarAMoodle } from './moodle';

const PanelDeNota = PageElement.located(By.css('[data-region="grade-panel"]')).describedAs('el panel de la nota');
const CampoNota = PageElement.located(By.css('[data-region="grade-panel"] input[name="grade"]')).describedAs('la nota');
const CampoComentario = PageElement.located(By.css('textarea[name="assignfeedbackcomments_editor[text]"]'))
  .describedAs('el comentario');
const BotonGuardar = PageElement.located(By.css('[data-region="grade-actions"] button[name="savechanges"]'))
  .describedAs('el botón «Save changes»');

/** El calificador de la tarea, en la entrega de Ana. */
export const AbrirElCalificador = () =>
  Task.where('#actor abre la entrega de Ana en el calificador',
    Abrir('el calificador', DireccionDelCaso('el calificador',
      ({ tarea, estudiante }) => `/mod/assign/view.php?id=${tarea}&action=grader&userid=${estudiante}`)),
    Wait.upTo(Duration.ofSeconds(20)).until(Text.of(PanelDeNota), includes('Grade out of 100')),
    EsperarAMoodle(),
  );

/** Escribe la nota (y el comentario, si se da) y guarda. */
export const Calificar = (nota: string, comentario?: string) =>
  Task.where(`#actor califica con «${nota}»`,
    Clear.theValueOf(CampoNota),
    Enter.theValue(nota).into(CampoNota),
    ...(comentario === undefined ? [] : [Clear.theValueOf(CampoComentario), Enter.theValue(comentario).into(CampoComentario)]),
    Click.on(BotonGuardar),
    EsperarAMoodle(),
  );

/**
 * La nota guardada, como la muestra el calificador en «Current grade in gradebook». El aviso de
 * guardado es un mensaje emergente que dura poco, así que no se usa.
 */
export const NotaEnElLibro = () =>
  Text.of(PageElement.located(By.id('fitem_id_currentgrade'))
    .describedAs('la nota en el libro de calificaciones'));

/** La nota que ve el estudiante en la sección «Feedback» de la tarea, por ejemplo «85.00 / 100.00». */
export const NotaQueVeElEstudiante = () =>
  Text.of(PageElement.located(By.xpath('//h3[normalize-space()="Feedback"]/..//th[normalize-space()="Grade"]/following-sibling::td[1]'))
    .describedAs('la nota de la retroalimentación'))
    .replaceAll(' ', ' ')
    .trim();
