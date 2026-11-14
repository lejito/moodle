// Resume los reportes de auditar.sh en resumen.md: los avisos de cada herramienta, por severidad, y
// el detalle de cada uno. Se llama con la carpeta de los reportes.
const fs = require('node:fs');
const path = require('node:path');

const carpeta = process.argv[2];
const leer = (archivo) => JSON.parse(fs.readFileSync(path.join(carpeta, archivo), 'utf8'));
const lineas = ['# Auditoría de seguridad', '', `Generado el ${new Date().toISOString()}.`, ''];

// composer audit: { advisories: { paquete: [ { advisoryId, title, cve, severity, ... } ] }, abandoned: {...} }
const composer = leer('composer.json');
const avisosPhp = Object.entries(composer.advisories || {}).flatMap(([paquete, avisos]) =>
  (Array.isArray(avisos) ? avisos : Object.values(avisos)).map((a) => ({ paquete, ...a })));
const abandonados = Object.entries(composer.abandoned || {});
lineas.push('## composer audit (dependencias PHP)', '');
lineas.push(`${avisosPhp.length} avisos de seguridad; ${abandonados.length} paquetes abandonados.`, '');
if (avisosPhp.length) {
  lineas.push('| Paquete | Severidad | CVE | Aviso |', '|---|---|---|---|');
  avisosPhp.forEach((a) => lineas.push(`| ${a.paquete} | ${a.severity || '—'} | ${a.cve || '—'} | ${a.title} |`));
  lineas.push('');
}
if (abandonados.length) {
  lineas.push('| Paquete abandonado | Reemplazo sugerido |', '|---|---|');
  abandonados.forEach(([paquete, reemplazo]) => lineas.push(`| ${paquete} | ${reemplazo || '—'} |`));
  lineas.push('');
}

// npm audit: { metadata: { vulnerabilities: { info, low, moderate, high, critical } }, vulnerabilities: {...} }
for (const [archivo, titulo] of [['npm-moodle.json', 'npm audit (dependencias de Moodle)'],
  ['npm-pruebas.json', 'npm audit (dependencias de las pruebas)']]) {
  const npm = leer(archivo);
  const total = npm.metadata?.vulnerabilities || {};
  lineas.push(`## ${titulo}`, '');
  lineas.push(`Crítica ${total.critical || 0} · alta ${total.high || 0} · moderada ${total.moderate || 0} · baja ${total.low || 0}.`, '');
  const paquetes = Object.values(npm.vulnerabilities || {});
  if (paquetes.length) {
    lineas.push('| Paquete | Severidad | Directa | Corrección disponible |', '|---|---|---|---|');
    paquetes.forEach((p) => lineas.push(`| ${p.name} | ${p.severity} | ${p.isDirect ? 'sí' : 'no'} | ${p.fixAvailable ? 'sí' : 'no'} |`));
    lineas.push('');
  }
}

// ZAP: { site: [ { alerts: [ { name, riskdesc, count, cweid, solution } ] } ] }
const zap = leer('zap.json');
const alertas = (zap.site || []).flatMap((sitio) => sitio.alerts || []);
lineas.push('## ZAP baseline (análisis dinámico pasivo)', '');
lineas.push(`${alertas.length} tipos de alerta.`, '');
if (alertas.length) {
  lineas.push('| Alerta | Riesgo | CWE | Instancias |', '|---|---|---|---|');
  alertas
    .sort((a, b) => Number(b.riskcode) - Number(a.riskcode))
    .forEach((a) => lineas.push(`| ${a.name} | ${a.riskdesc} | ${a.cweid || '—'} | ${a.count} |`));
  lineas.push('');
}

fs.writeFileSync(path.join(carpeta, 'resumen.md'), `${lineas.join('\n')}\n`);
