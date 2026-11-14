// Presupuesto de consultas a Gemini, compartido por todas las suites con IA.
//
// El plan gratuito de Gemini Flash-Lite da 15 consultas por minuto (y 500 al día). Stagehand reintenta
// al instante una consulta rechazada, no cuando la cuota lo permite, y un act() puede gastar dos
// consultas: por eso se permiten 6 operaciones por ventana de 62 s, la mitad del límite. Stagehand, el
// juez de DeepEval y el resumen de Moodle usan el mismo modelo y la misma clave, así que gastan el mismo
// cupo: los tres toman turno en el mismo archivo (pruebas/.cache/gemini.json), con el mismo algoritmo
// (deepeval/conftest.py lo repite en Python).
//
// Los límites reales del proyecto de la clave se leen en https://aistudio.google.com/rate-limit; Google
// no los publica. GEMINI_POR_VENTANA cambia el presupuesto.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { setTimeout as esperar } from 'node:timers/promises';

const POR_VENTANA = Number(process.env.GEMINI_POR_VENTANA ?? 6);
const VENTANA_MS = 62_000;
const ARCHIVO = path.join(import.meta.dirname, '..', '..', '.cache', 'gemini.json');

function leer(): number[] {
  try {
    return JSON.parse(readFileSync(ARCHIVO, 'utf8')) as number[];
  } catch {
    return [];
  }
}

function escribir(marcas: number[]): void {
  mkdirSync(path.dirname(ARCHIVO), { recursive: true });
  writeFileSync(ARCHIVO, JSON.stringify(marcas));
}

/** Espera hasta que haya lugar en la ventana y lo ocupa. Se llama antes de cada consulta al modelo. */
export async function tomarTurno(): Promise<void> {
  for (;;) {
    const ahora = Date.now();
    const recientes = leer().filter((marca) => ahora - marca < VENTANA_MS);
    if (recientes.length < POR_VENTANA) {
      escribir([...recientes, ahora]);
      return;
    }
    await esperar(VENTANA_MS - (ahora - recientes[0]!) + 250);
  }
}
