// Barreras de accesibilidad ya registradas: reglas de axe-core que Moodle incumple en las pantallas
// revisadas, con su ID de hallazgo (docs/accesibilidad/barreras.md). Una prueba de accesibilidad
// falla si aparece una regla que no está aquí: es una barrera nueva, una regresión, que hay que
// revisar y registrar.
module.exports = {
  // WCAG 2.5.3 (A). El nombre accesible no contiene el texto visible: el menú de usuario muestra las
  // iniciales («AE») y se anuncia «User menu»; la bandera de las preguntas, el orden de la lista de
  // debates y el menú de acciones de un mensaje tienen el mismo problema.
  'label-content-name-mismatch': 'A11Y-01',
  // WCAG 1.3.1 (A). El selector de etiquetas del formulario completo del foro tiene un rol ARIA de
  // lista sin los hijos que ese rol exige.
  'aria-required-children': 'A11Y-02',
};
