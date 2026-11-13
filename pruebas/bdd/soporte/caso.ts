// Los datos del caso de caja negra que está corriendo, los que entrega pruebas/seed/preparar.php.
//
// Cada escenario lleva en el nombre el caso que implementa (por ejemplo «MOOD-CP-101 - ...»). Antes
// de correrlo, serenity.ts llama a prepararCaso() con ese ID: preparar.php deja el sitio como lo
// pide el caso y devuelve los IDs del curso y sus actividades, la clave, la contraseña, etc.
import { execFileSync } from 'node:child_process';
import path from 'node:path';

/** Lo que devuelve preparar.php; cada funcionalidad agrega sus propios campos. */
export type DatosDelCaso = Record<string, any> & {
  caso: string;
  curso: number;
  contrasena: string;
};

// Igual que en Cypress: PREPARAR trae el comando completo (Jenkins usa docker exec); si no está,
// se usa el servicio web del entorno local.
const preparar = process.env.PREPARAR
  ? process.env.PREPARAR.split(' ')
  : ['docker', 'compose', '-f', path.join(__dirname, '..', '..', 'docker', 'compose.yml'),
    'exec', '-T', 'web', 'php', 'pruebas/seed/preparar.php'];

let actual: DatosDelCaso | undefined;

/** Prepara el sitio para el caso y guarda sus datos. */
export function prepararCaso(caso: string): DatosDelCaso {
  const salida = execFileSync(preparar[0], [...preparar.slice(1), caso], { encoding: 'utf8' });
  actual = JSON.parse(salida.trim().split('\n').pop() as string);
  return actual as DatosDelCaso;
}

/** Los datos del caso en curso. */
export function datosDelCaso(): DatosDelCaso {
  if (!actual) {
    throw new Error('El escenario no nombra un caso MOOD-CP-NNN, así que el sitio no se preparó.');
  }
  return actual;
}

/** El caso de caja negra que nombra un escenario, por ejemplo MOOD-CP-111-fin; o null. */
export function casoDelEscenario(nombre: string): string | null {
  return nombre.match(/MOOD-CP-\d{3}(-[a-z]+)?/)?.[0] ?? null;
}
