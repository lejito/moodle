// RF-MOOD-04 · Presentar un cuestionario.
import { Given, Then, When } from '@cucumber/cucumber';
import { actorInTheSpotlight, type Actor } from '@serenity-js/core';
import { Ensure, isPresent, not, startsWith } from '@serenity-js/assertions';
import {
  AbrirElCuestionario,
  BotonDeEmpezar,
  BotonDeReintentar,
  EmpezarUnIntento,
  NotaDelIntento,
  ResponderLasPreguntas,
  TerminarElIntento,
} from '../screenplay/cuestionario';

Given('que {pronombre} abrió el cuestionario', (actor: Actor) => actor.attemptsTo(AbrirElCuestionario()));

When('{pronombre} abre el cuestionario', (actor: Actor) => actor.attemptsTo(AbrirElCuestionario()));

When('{pronombre} empieza un intento', (actor: Actor) => actor.attemptsTo(EmpezarUnIntento()));

When('{pronombre} responde {string}, {string} y {string}', (actor: Actor, vf: string, corta: string, numerica: string) =>
  actor.attemptsTo(ResponderLasPreguntas(vf, corta, numerica)));

When('{pronombre} termina el intento', (actor: Actor) => actor.attemptsTo(TerminarElIntento()));

Then('su nota del intento es {string}', (nota: string) =>
  actorInTheSpotlight().attemptsTo(Ensure.eventually(NotaDelIntento(), startsWith(nota))));

Then('{pronombre} no puede empezar un intento', (actor: Actor) =>
  actor.attemptsTo(
    Ensure.that(BotonDeEmpezar(), not(isPresent())),
    Ensure.that(BotonDeReintentar(), not(isPresent())),
  ));
