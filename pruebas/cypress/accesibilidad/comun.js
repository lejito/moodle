// Lo común a las pruebas de accesibilidad.
const CONOCIDAS = require('./barreras-conocidas');

/**
 * Falla si axe encontró una regla que no está en barreras-conocidas.js: una barrera nueva. Las
 * conocidas se registran en el reporte (barreras.html) pero no hacen fallar la prueba.
 */
function debeTenerSoloBarrerasConocidas(violaciones) {
  const nuevas = violaciones.filter((v) => !CONOCIDAS[v.regla]).map((v) => `${v.regla} (${v.impacto})`);
  expect(nuevas, 'barreras nuevas, que no están en barreras-conocidas.js').to.deep.eq([]);
}

/** Si el elemento con el foco muestra un indicador visible: contorno o sombra (WCAG 2.4.7). */
function focoVisible(elemento) {
  const estilo = elemento.ownerDocument.defaultView.getComputedStyle(elemento);
  const contorno = estilo.outlineStyle !== 'none' && parseFloat(estilo.outlineWidth) > 0;
  return contorno || (estilo.boxShadow && estilo.boxShadow !== 'none');
}

/**
 * Pulsa Tab, con eventos de teclado reales, hasta que el foco llega a un elemento que cumple
 * `esElBuscado`, y comprueba que ese foco se ve (WCAG 2.1.1 y 2.4.7). Falla si no llega en
 * `maximo` pulsaciones: el elemento no se alcanza con el teclado. Entrega cuántas hicieron falta.
 */
function tabularHasta(descripcion, esElBuscado, maximo = 80, pulsaciones = 0) {
  return cy.document({ log: false }).then((documento) => {
    const activo = documento.activeElement;
    if (activo && activo !== documento.body && esElBuscado(activo)) {
      Cypress.log({ name: 'teclado', message: `${descripcion}: ${pulsaciones} pulsaciones de Tab` });
      expect(focoVisible(activo), `el foco en ${descripcion} se ve`).to.eq(true);
      return pulsaciones;
    }
    expect(pulsaciones, `${descripcion} se alcanza con Tab`).to.be.lessThan(maximo);
    cy.press(Cypress.Keyboard.Keys.TAB, { log: false });
    return tabularHasta(descripcion, esElBuscado, maximo, pulsaciones + 1);
  });
}

/**
 * Comprueba que la página se lee a 320 px de ancho sin desplazamiento horizontal (WCAG 1.4.10,
 * reflujo). Equivale a una pantalla de 1280 px con zoom al 400 %. `desbordeConocido` son los px
 * que se desborda por una barrera ya registrada: la prueba falla si el desborde crece.
 */
function debeReajustarseA320(ruta, desbordeConocido = 0) {
  cy.viewport(320, 800);
  cy.abrir(ruta);
  cy.document().then((documento) => {
    const ancho = documento.documentElement.scrollWidth;
    const ventana = documento.defaultView.innerWidth;
    expect(ancho, `ancho del contenido (px) en una ventana de ${ventana} px`).to.be.at.most(ventana + desbordeConocido);
  });
}

module.exports = { debeTenerSoloBarrerasConocidas, tabularHasta, debeReajustarseA320 };
