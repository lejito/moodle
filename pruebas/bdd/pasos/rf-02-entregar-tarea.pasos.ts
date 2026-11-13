// RF-MOOD-02 · Entregar una tarea.
import { Given, Then, When } from '@cucumber/cucumber';
import { actorInTheSpotlight, type Actor } from '@serenity-js/core';
import { Ensure, includes, isPresent, not } from '@serenity-js/assertions';
import { DebeVerse } from '../screenplay/moodle';
import {
  AbrirLaTarea,
  BotonDeLaEntrega,
  EnviarParaCalificar,
  EstadoDeLaEntrega,
  GuardarLaEntrega,
} from '../screenplay/tarea';

Given('que {pronombre} abrió la tarea', (actor: Actor) => actor.attemptsTo(AbrirLaTarea()));

When('{pronombre} abre la tarea', (actor: Actor) => actor.attemptsTo(AbrirLaTarea()));

When('{pronombre} guarda la entrega con el texto {string}', (actor: Actor, texto: string) =>
  actor.attemptsTo(GuardarLaEntrega(texto)));

When('{pronombre} envía la entrega para calificar', (actor: Actor) => actor.attemptsTo(EnviarParaCalificar()));

Then('el estado de su entrega es {string}', (estado: string) =>
  actorInTheSpotlight().attemptsTo(Ensure.eventually(EstadoDeLaEntrega(), includes(estado))));

Then('{pronombre} ya no puede editar la entrega', (actor: Actor) =>
  actor.attemptsTo(Ensure.that(BotonDeLaEntrega('Edit submission'), not(isPresent()))));

Then('su entrega figura como tardía', () =>
  actorInTheSpotlight().attemptsTo(DebeVerse(/Assignment was submitted .* late/)));

Then('{pronombre} no tiene cómo agregar una entrega', (actor: Actor) =>
  actor.attemptsTo(Ensure.that(BotonDeLaEntrega('Add submission'), not(isPresent()))));
