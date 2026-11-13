// Pasos que sirven a todas las funcionalidades.
import { Given, Then } from '@cucumber/cucumber';
import type { Actor } from '@serenity-js/core';
import { DebeVerse, IniciarSesion } from '../screenplay/moodle';

Given('que {actor} inició sesión', (actor: Actor) => actor.attemptsTo(IniciarSesion()));

Then('{pronombre} ve el aviso {string}', (actor: Actor, texto: string) => actor.attemptsTo(DebeVerse(texto)));
