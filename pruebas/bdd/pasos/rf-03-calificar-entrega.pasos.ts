// RF-MOOD-03 · Calificar una entrega.
import { Given, Then, When } from '@cucumber/cucumber';
import { actorInTheSpotlight, type Actor } from '@serenity-js/core';
import { Ensure, equals, includes, not } from '@serenity-js/assertions';
import { AbrirElCalificador, Calificar, NotaEnElLibro, NotaQueVeElEstudiante } from '../screenplay/calificacion';
import { IniciarSesion } from '../screenplay/moodle';
import { AbrirLaTarea } from '../screenplay/tarea';

Given('que {pronombre} abrió la entrega de Ana en el calificador', (actor: Actor) =>
  actor.attemptsTo(AbrirElCalificador()));

When('{pronombre} califica con {string}', (actor: Actor, nota: string) => actor.attemptsTo(Calificar(nota)));

When('{pronombre} califica con {string} y el comentario {string}', (actor: Actor, nota: string, comentario: string) =>
  actor.attemptsTo(Calificar(nota, comentario)));

When('{actor} inicia sesión y abre la tarea', (actor: Actor) => actor.attemptsTo(IniciarSesion(), AbrirLaTarea()));

Then('la nota en el libro de calificaciones es {string}', (nota: string) =>
  actorInTheSpotlight().attemptsTo(Ensure.eventually(NotaEnElLibro(), includes(nota))));

Then('{pronombre} ve la nota {string}', (actor: Actor, nota: string) =>
  actor.attemptsTo(Ensure.eventually(NotaQueVeElEstudiante(), equals(nota))));

// Sin nota guardada, «Current grade in gradebook» no muestra ninguna con decimales.
Then('la entrega sigue sin nota', () =>
  actorInTheSpotlight().attemptsTo(Ensure.that(NotaEnElLibro(), not(includes('.00')))));
