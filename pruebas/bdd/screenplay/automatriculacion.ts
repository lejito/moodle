// RF-MOOD-01 · Automatricularse con clave: tareas y preguntas.
import { Duration, Task, Wait } from '@serenity-js/core';
import { isPresent, not } from '@serenity-js/assertions';
import { By, Click, Enter, isVisible, PageElement, Text } from '@serenity-js/web';
import { Abrir, DireccionDelCaso, EsperarAMoodle } from './moodle';

export const BotonMatricularme = PageElement.located(By.cssContainingText('button[type="submit"][data-instance]', 'Enrol me'))
  .describedAs('el botón «Enrol me»');
const CampoClave = PageElement.located(By.css('.modal-dialog input[name="enrolpassword"]'))
  .describedAs('el campo de la clave');
const BotonConfirmar = PageElement.located(By.css('.modal-dialog .modal-footer button[data-action="save"]'))
  .describedAs('el botón de confirmar la matrícula');

/** La página de opciones de matriculación del curso. */
export const AbrirLaMatriculacion = () =>
  Abrir('la matriculación del curso',
    DireccionDelCaso('la matriculación del curso', ({ curso }) => `/enrol/index.php?id=${curso}`));

/** Abre la matriculación, pulsa «Enrol me», escribe la clave en la ventana y la confirma. */
export const MatricularseConLaClave = (clave: string) =>
  Task.where(`#actor se matricula con la clave «${clave}»`,
    AbrirLaMatriculacion(),
    Click.on(BotonMatricularme),
    Wait.until(CampoClave, isVisible()),
    ...(clave === '' ? [] : [Enter.theValue(clave).into(CampoClave)]),
    Click.on(BotonConfirmar),
    EsperarAMoodle(),
  );

/** El error de la clave en la ventana. En los formularios dinámicos, el id lleva un sufijo al azar. */
export const ErrorDeLaClave = () =>
  Text.of(PageElement.located(By.css('.modal-dialog [id^="id_error_enrolpassword"]')).describedAs('el error de la clave'));

/** El título del curso en el que está. */
export const TituloDeLaPagina = () => Text.of(PageElement.located(By.css('h1')).describedAs('el título de la página'));

/** Espera a que el botón de matricularse desaparezca o no esté. */
export const NoDebeOfrecerseLaMatricula = () =>
  Wait.upTo(Duration.ofSeconds(10)).until(BotonMatricularme, not(isPresent()));
