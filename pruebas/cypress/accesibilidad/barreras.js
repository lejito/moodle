// Junta lo que encontró axe en cada pantalla (reportes/accesibilidad/pantallas/*.json) en la tabla de
// barreras: una fila por regla incumplida, con su impacto, los criterios WCAG, las pantallas donde
// aparece y cuántos elementos la incumplen. Escribe barreras.json y barreras.html en la carpeta de
// reportes de la suite. Lo llama la tarea registrarAccesibilidad de cypress/configuracion.js.
const fs = require('node:fs');
const path = require('node:path');

const ORDEN_IMPACTO = { critical: 0, serious: 1, moderate: 2, minor: 3 };
const IMPACTO = { critical: 'Crítico', serious: 'Grave', moderate: 'Moderado', minor: 'Menor' };

/** wcag143 -> 1.4.3; wcag2aa -> null (es un nivel, no un criterio). */
function criterio(etiqueta) {
  const m = etiqueta.match(/^wcag(\d)(\d)(\d+)$/);
  return m ? `${m[1]}.${m[2]}.${m[3]}` : null;
}

function escapar(texto) {
  return String(texto).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
}

function escribir(raiz) {
  const carpeta = path.join(raiz, 'pantallas');
  const pantallas = fs.readdirSync(carpeta)
    .filter((archivo) => archivo.endsWith('.json'))
    .map((archivo) => JSON.parse(fs.readFileSync(path.join(carpeta, archivo), 'utf8')))
    .sort((a, b) => a.caso.localeCompare(b.caso));

  const reglas = new Map();
  for (const pantalla of pantallas) {
    for (const v of pantalla.violaciones) {
      if (!reglas.has(v.regla)) {
        reglas.set(v.regla, {
          regla: v.regla,
          impacto: v.impacto,
          descripcion: v.descripcion,
          ayuda: v.ayuda,
          criterios: [...new Set(v.etiquetas.map(criterio).filter(Boolean))],
          pantallas: [],
          elementos: 0,
        });
      }
      const fila = reglas.get(v.regla);
      fila.pantallas.push(`${pantalla.caso} ${pantalla.pantalla}`);
      fila.elementos += v.elementos.length;
    }
  }
  const barreras = [...reglas.values()].sort((a, b) =>
    ORDEN_IMPACTO[a.impacto] - ORDEN_IMPACTO[b.impacto] || b.elementos - a.elementos);

  fs.writeFileSync(path.join(raiz, 'barreras.json'), JSON.stringify({ pantallas, barreras }, null, 2));

  const filas = barreras.map((b) => `
      <tr>
        <td><a href="${escapar(b.ayuda)}">${escapar(b.regla)}</a></td>
        <td class="${escapar(b.impacto)}">${IMPACTO[b.impacto] ?? escapar(b.impacto)}</td>
        <td>${escapar(b.criterios.join(', ') || '—')}</td>
        <td>${escapar(b.descripcion)}</td>
        <td>${b.pantallas.map(escapar).join('<br>')}</td>
        <td class="num">${b.elementos}</td>
      </tr>`).join('');
  const resumen = pantallas.map((p) => `
      <tr>
        <td>${escapar(p.caso)}</td>
        <td>${escapar(p.pantalla)}</td>
        <td>${escapar(p.url)}</td>
        <td class="num">${p.violaciones.length}</td>
        <td class="num">${p.violaciones.reduce((n, v) => n + v.elementos.length, 0)}</td>
      </tr>`).join('');
  fs.writeFileSync(path.join(raiz, 'barreras.html'), `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>Barreras de accesibilidad</title>
<style>
  body { font: 14px/1.5 Arial, sans-serif; margin: 24px; color: #1a1a1a; }
  table { border-collapse: collapse; margin-bottom: 32px; width: 100%; }
  th, td { border: 1px solid #ccc; padding: 6px 8px; text-align: left; vertical-align: top; }
  th { background: #1f4e78; color: #fff; }
  .num { text-align: right; }
  .critical { color: #9c0006; font-weight: bold; } .serious { color: #c65911; font-weight: bold; }
  .moderate { color: #7f6000; } .minor { color: #375623; }
</style>
</head>
<body>
<h1>Barreras de accesibilidad (axe-core, WCAG 2.2 A y AA)</h1>
<p>${pantallas.length} pantallas revisadas, ${barreras.length} reglas incumplidas. Generado el ${new Date().toISOString()}.</p>
<h2>Barreras por regla</h2>
<table>
  <thead><tr><th>Regla</th><th>Impacto</th><th>Criterios WCAG</th><th>Qué pasa</th><th>Pantallas</th><th>Elementos</th></tr></thead>
  <tbody>${filas}</tbody>
</table>
<h2>Pantallas revisadas</h2>
<table>
  <thead><tr><th>Caso</th><th>Pantalla</th><th>Ruta</th><th>Reglas incumplidas</th><th>Elementos</th></tr></thead>
  <tbody>${resumen}</tbody>
</table>
</body>
</html>
`);
}

module.exports = { escribir };
