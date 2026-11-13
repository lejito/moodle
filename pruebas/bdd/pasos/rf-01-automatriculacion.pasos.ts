// RF-MOOD-01 · Automatricularse con clave.
import { Then, When } from '@cucumber/cucumber';
import type { Actor } from '@serenity-js/core';
import { Ensure, equals, includes, isPresent } from '@serenity-js/assertions';
import {
  AbrirLaMatriculacion,
  BotonMatricularme,
  ErrorDeLaClave,
  MatricularseConLaClave,
  NoDebeOfrecerseLaMatricula,
  TituloDeLaPagina,
} from '../screenplay/automatriculacion';
import { RutaActual } from '../screenplay/moodle';

When('{pronombre} abre la matriculación del curso', (actor: Actor) => actor.attemptsTo(AbrirLaMatriculacion()));

When('{pronombre} se matricula en el curso con la clave {string}', (actor: Actor, clave: string) =>
  actor.attemptsTo(MatricularseConLaClave(clave)));

Then('{pronombre} entra al curso {string}', (actor: Actor, curso: string) =>
  actor.attemptsTo(
    Ensure.eventually(RutaActual(), equals('/course/view.php')),
    Ensure.that(TituloDeLaPagina(), includes(curso)),
  ));

Then('{pronombre} ve el error {string}', (actor: Actor, mensaje: string) =>
  actor.attemptsTo(Ensure.eventually(ErrorDeLaClave(), includes(mensaje))));

// Al volver a la matriculación, la página sigue ofreciendo matricularse: no quedó matriculado.
Then('{pronombre} sigue sin matricularse', (actor: Actor) =>
  actor.attemptsTo(
    AbrirLaMatriculacion(),
    Ensure.that(RutaActual(), equals('/enrol/index.php')),
    Ensure.that(BotonMatricularme, isPresent()),
  ));

Then('{pronombre} no puede matricularse', (actor: Actor) => actor.attemptsTo(NoDebeOfrecerseLaMatricula()));
