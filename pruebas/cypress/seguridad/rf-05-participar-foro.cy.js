// RF-MOOD-05 · Participar en un foro: seguridad (OWASP Top 10:2025, A01 y A05).
//
// Casos MOOD-CP-581 a 584. Ana (estudiante.a) frente al mensaje de Diana (docente) y a los suyos.
// En 581 y 582 el mensaje de Diana es reciente: si no, Moodle rechaza por el plazo de edición
// (30 minutos) antes de mirar el permiso, y la prueba no comprobaría el permiso.
const { CARGA_XSS, debeNegarElAcceso, debeNeutralizarLaCarga } = require('./comun');

describe('RF-MOOD-05 · Participar en un foro (seguridad)', () => {
  let datos;

  const prepararComoAna = (caso) => cy.preparar(caso).then((d) => {
    datos = d;
    cy.iniciarSesion('estudiante.a', d.contrasena);
  });

  /** Publica una respuesta de Ana al mensaje de Diana por la API y entrega su id. */
  const responderPorApi = (mensaje) => cy.then(() => cy.servicioWeb(datos.tokens['estudiante.a'], 'mod_forum_add_discussion_post', {
    postid: datos.mensaje,
    subject: `Re: ${datos.nombreDebate}`,
    message: mensaje,
  })).its('postid');

  /** Los ids de los mensajes del debate, por la API. */
  const mensajesDelDebate = () => cy.then(() => cy.servicioWeb(datos.tokens['estudiante.a'], 'mod_forum_get_discussion_posts', {
    discussionid: datos.debate,
  })).then((respuesta) => respuesta.posts.map((post) => post.id));

  it('MOOD-CP-581 - un estudiante no borra el mensaje de la docente (A01)', () => {
    prepararComoAna('MOOD-CP-581');
    cy.then(() => cy.request({ url: `/mod/forum/post.php?delete=${datos.mensaje}`, failOnStatusCode: false }))
      .then((respuesta) => {
        expect(respuesta.body, 'no rechaza por el plazo, sino por el permiso').not.to.match(/maximum time for editing/);
        debeNegarElAcceso(respuesta, /can(&#039;|')t delete|cannot delete|do not currently have permissions/i);
      });
    mensajesDelDebate().then((ids) => expect(ids).to.include(datos.mensaje));
  });

  it('MOOD-CP-582 - un estudiante no edita el mensaje de la docente (A01)', () => {
    prepararComoAna('MOOD-CP-582');
    cy.then(() => cy.request({ url: `/mod/forum/post.php?edit=${datos.mensaje}`, failOnStatusCode: false }))
      .then((respuesta) => {
        expect(respuesta.body, 'no rechaza por el plazo, sino por el permiso').not.to.match(/maximum time for editing/);
        debeNegarElAcceso(respuesta, /can(&#039;|')t edit other people|cannot edit|do not currently have permissions/i);
      });
  });

  // Con un sesskey inválido, Moodle no borra y vuelve a pedir la confirmación (post.php solo borra
  // si confirm_sesskey() da verdadero).
  it('MOOD-CP-583 - borrar la propia respuesta sin el sesskey válido no la borra (A01, CSRF)', () => {
    prepararComoAna('MOOD-CP-583');
    responderPorApi('Respuesta que no se debe borrar').then((respuesta) => {
      cy.request({
        method: 'POST',
        url: '/mod/forum/post.php',
        form: true,
        failOnStatusCode: false,
        body: { delete: respuesta, confirm: respuesta, sesskey: 'sesskey-falso' },
      }).its('body').should('match', /Are you sure you want to delete this post/);
      mensajesDelDebate().then((ids) => expect(ids, 'la respuesta sigue en el debate').to.include(respuesta));
    });
  });

  it('MOOD-CP-584 - una carga de XSS en una respuesta no se ejecuta (A05)', () => {
    prepararComoAna('MOOD-CP-584');
    responderPorApi(CARGA_XSS);
    cy.then(() => cy.abrir(`/mod/forum/discuss.php?d=${datos.debate}`));
    debeNeutralizarLaCarga();
    cy.then(() => cy.iniciarSesion('docente', datos.contrasena));
    cy.then(() => cy.abrir(`/mod/forum/discuss.php?d=${datos.debate}`));
    debeNeutralizarLaCarga();
  });
});
