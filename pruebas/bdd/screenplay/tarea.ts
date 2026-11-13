// RF-MOOD-02 · Entregar una tarea: tareas y preguntas.
import { Task } from '@serenity-js/core';
import { By, Clear, Enter, PageElement } from '@serenity-js/web';
import { Abrir, Boton, CeldaDe, DireccionDelCaso, Pulsar } from './moodle';

const TextoEnLinea = PageElement.located(By.css('textarea[name="onlinetext_editor[text]"]'))
  .describedAs('el texto en línea');

/** La página de la «Tarea de laboratorio». */
export const AbrirLaTarea = () =>
  Abrir('la tarea', DireccionDelCaso('la tarea', ({ tarea }) => `/mod/assign/view.php?id=${tarea}`));

/** Abre el formulario de la entrega, deja el texto dado y guarda. */
export const GuardarLaEntrega = (texto: string) =>
  Task.where(`#actor guarda la entrega con el texto «${texto}»`,
    Pulsar('Add submission'),
    Clear.theValueOf(TextoEnLinea),
    ...(texto === '' ? [] : [Enter.theValue(texto).into(TextoEnLinea)]),
    Pulsar('Save changes'),
  );

/** Envía la entrega para calificar y confirma. */
export const EnviarParaCalificar = () =>
  Task.where('#actor envía la entrega para calificar',
    Pulsar('Submit assignment'),
    Pulsar('Continue'),
  );

/** El estado de la entrega, en la tabla del estado de la entrega. */
export const EstadoDeLaEntrega = () => CeldaDe('Submission status');

/** El botón para agregar o editar la entrega. */
export const BotonDeLaEntrega = (texto: 'Add submission' | 'Edit submission') => Boton(texto);
