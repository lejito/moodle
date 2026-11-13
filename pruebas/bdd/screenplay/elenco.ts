// El elenco: quiénes son los actores de los escenarios y qué saben hacer.
//
// Cada actor es un usuario sembrado y navega con su propio contexto de Playwright (su sesión de
// Moodle no se mezcla con la de los demás).
import type { Browser } from 'playwright';
import type { Actor, Cast } from '@serenity-js/core';
import { BrowseTheWebWithPlaywright } from '@serenity-js/playwright';

/** El usuario de Moodle de cada actor. */
export const USUARIOS: Record<string, string> = {
  Ana: 'estudiante.a',
  Bruno: 'estudiante.b',
  Diana: 'docente',
};

export const elenco = (navegador: Browser, baseURL: string): Cast => ({
  prepare: (actor: Actor) => actor.whoCan(
    BrowseTheWebWithPlaywright.using(navegador, {
      baseURL,
      viewport: { width: 1366, height: 900 },
    }),
  ),
});
