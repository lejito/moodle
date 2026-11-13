// RF-MOOD-05 · Participar en un foro.
import { Then, When } from '@cucumber/cucumber';
import { actorInTheSpotlight, type Actor } from '@serenity-js/core';
import { Ensure, equals } from '@serenity-js/assertions';
import { Text } from '@serenity-js/web';
import { AbrirElDebateInicial, BotonesResponder, MensajesDelDebate, ResponderAlDebate } from '../screenplay/foro';

When('{pronombre} abre el debate inicial', (actor: Actor) => actor.attemptsTo(AbrirElDebateInicial()));

When('{pronombre} responde {string}', (actor: Actor, texto: string) => actor.attemptsTo(ResponderAlDebate(texto)));

// La respuesta aparece como un mensaje más del debate, con su texto.
Then('el debate muestra su respuesta {string}', (texto: string) =>
  actorInTheSpotlight().attemptsTo(
    Ensure.eventually(MensajesDelDebate().count(), equals(2)),
    Ensure.eventually(Text.ofAll(MensajesDelDebate()).some((mensaje: string) => mensaje.includes(texto)), equals(true)),
  ));

Then('{pronombre} no puede responder', (actor: Actor) =>
  actor.attemptsTo(Ensure.that(BotonesResponder().count(), equals(0))));
