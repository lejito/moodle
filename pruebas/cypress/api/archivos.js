// Descarga de archivos por /webservice/pluginfile.php.
//
// Casos MOOD-CP-261 a 263, 461, 462 y 563, uno por cada función *_pluginfile() de las cinco
// funcionalidades. Caracterizan la búsqueda del archivo antes y después de MOOD-DEF-002, que la
// cambia de get_file_by_hash(sha1(ruta)) a get_file(): el archivo pedido se sirve con su contenido y
// el mismo nombre en otra carpeta, o un archivo que no existe, responden 404. preparar.php deja el
// archivo y entrega su ruta y su contenido en datos.archivo.

/**
 * Comprueba que se sirve el archivo preparado, y nada más, al usuario del token.
 *
 * @param {object} datos Lo que entregó cy.preparar(caso).
 * @param {string} usuario El dueño del token.
 */
const debeServirSoloElArchivo = (datos, usuario = 'estudiante.a') => {
  const token = datos.tokens[usuario];
  const { ruta, contenido } = datos.archivo;
  const carpeta = ruta.slice(0, ruta.lastIndexOf('/'));
  const nombre = ruta.slice(ruta.lastIndexOf('/') + 1);

  cy.descargarArchivo(token, ruta).then((respuesta) => {
    expect(respuesta.status, 'el archivo pedido').to.eq(200);
    expect(respuesta.body).to.eq(contenido);
  });
  cy.descargarArchivo(token, `${carpeta}/no-existe.txt`).its('status').should('eq', 404);
  cy.descargarArchivo(token, `${carpeta}/carpeta/${nombre}`).its('status').should('eq', 404);
};

module.exports = { debeServirSoloElArchivo };
