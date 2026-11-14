// RF-MOOD-05 · Participar en un foro, por la API REST.
//
// Casos MOOD-CP-551 a 562. Los hace estudiante.a en el «Foro de laboratorio», que la preparación
// deja con solo el «Debate inicial» del docente. capabilities.reply de cada mensaje dice si el
// estudiante puede responderlo; mod_forum_add_discussion_post lo comprueba de nuevo en el servidor.
// MOOD-CP-563 descarga un adjunto del foro (MOOD-DEF-002, ver archivos.js).

const { debeServirSoloElArchivo } = require('./archivos');

describe('RF-MOOD-05 · Participar en un foro (API)', () => {
  let datos;

  const preparar = (caso) => cy.preparar(caso).then((d) => {
    datos = d;
  });

  const llamar = (funcion, parametros) => cy.servicioWeb(datos.tokens['estudiante.a'], funcion, parametros);

  /** Los mensajes de un debate, como los ve estudiante.a. */
  const mensajes = (debate) => cy.then(() => llamar('mod_forum_get_discussion_posts', { discussionid: datos[debate] }))
    .its('posts');

  /** Responde a un mensaje. */
  const responder = (mensaje, texto) => cy.then(() => llamar('mod_forum_add_discussion_post', {
    postid: datos[mensaje],
    subject: `Re: ${datos.nombreDebate}`,
    message: texto,
  }));

  /** Comprueba que el mensaje del debate no se puede responder, ni en los permisos ni al intentarlo. */
  const debeImpedirResponder = (debate = 'debate', mensaje = 'mensaje') => {
    mensajes(debate).then((posts) => {
      expect(posts[0].capabilities.reply, 'puede responder').to.eq(false);
    });
    responder(mensaje, 'Respuesta que no debe quedar').then((respuesta) => {
      expect(respuesta.exception).to.match(/moodle_exception$/);
      expect(respuesta.errorcode).to.eq('nopostforum');
    });
    mensajes(debate).should('have.length', 1);
  };

  it('MOOD-CP-551 - lee el debate y puede responderlo', () => {
    preparar('MOOD-CP-551');
    mensajes('debate').then((posts) => {
      expect(posts).to.have.length(1);
      expect(posts[0]).to.include({ subject: 'Debate inicial', message: '¿Qué esperan aprender en este curso?' });
      expect(posts[0].author.fullname).to.eq('Diana Docente');
      expect(posts[0].capabilities.reply).to.eq(true);
    });
  });

  it('MOOD-CP-552 - publica una respuesta y aparece en el debate', () => {
    preparar('MOOD-CP-552');
    responder('mensaje', 'Respuesta por la API').then((respuesta) => {
      expect(respuesta.warnings).to.deep.eq([]);
      expect(respuesta.postid).to.be.a('number');
      expect(respuesta.post.author.fullname).to.eq('Ana Estudiante');
    });
    mensajes('debate').then((posts) => {
      expect(posts.map((post) => post.message)).to.include('Respuesta por la API');
    });
  });

  it('MOOD-CP-553 - no responde a un mensaje que no existe', () => {
    preparar('MOOD-CP-553');
    cy.then(() => llamar('mod_forum_add_discussion_post', {
      postid: 999999999,
      subject: 'Re: nada',
      message: 'Respuesta a la nada',
    })).then((respuesta) => {
      expect(respuesta.errorcode).to.eq('invalidparentpostid');
    });
    mensajes('debate').should('have.length', 1);
  });

  it('MOOD-CP-554 - en el foro de avisos no se responde', () => {
    preparar('MOOD-CP-554');
    debeImpedirResponder('aviso', 'mensajeAviso');
  });

  it('MOOD-CP-555 - después del corte no se responde', () => {
    preparar('MOOD-CP-555');
    debeImpedirResponder();
  });

  it('MOOD-CP-556 - un debate bloqueado no se responde', () => {
    preparar('MOOD-CP-556');
    debeImpedirResponder();
  });

  it('MOOD-CP-557 - un debate bloqueado por inactividad no se responde', () => {
    preparar('MOOD-CP-557');
    debeImpedirResponder();
  });

  it('MOOD-CP-558 - el debate de otro grupo no se ve ni se responde', () => {
    preparar('MOOD-CP-558');
    mensajes('debateGrupo').should('deep.eq', []);
    responder('mensajeGrupo', 'Respuesta en otro grupo').then((respuesta) => {
      expect(respuesta.errorcode).to.eq('nopostforum');
    });
    cy.then(() => cy.servicioWeb(datos.tokens.docente, 'mod_forum_get_discussion_posts', {
      discussionid: datos.debateGrupo,
    })).its('posts').should('have.length', 1);
  });

  it('MOOD-CP-559 - sin el permiso de responder no se responde', () => {
    preparar('MOOD-CP-559');
    debeImpedirResponder();
  });

  it('MOOD-CP-560 - después del vencimiento, y antes del corte, sí se responde', () => {
    preparar('MOOD-CP-560');
    responder('mensaje', 'Respuesta después del vencimiento').its('warnings').should('deep.eq', []);
    mensajes('debate').should('have.length', 2);
  });

  // Hallazgos H-API-01 y H-API-02: antes se guardaba una respuesta vacía y un asunto de 256
  // caracteres llegaba a la base de datos. Corregidos con TDD en add_discussion_post().
  it('MOOD-CP-561 - una respuesta vacía no se guarda', () => {
    preparar('MOOD-CP-561');
    responder('mensaje', '<p> </p>').then((respuesta) => {
      expect(respuesta.exception).to.match(/moodle_exception$/);
      expect(respuesta.errorcode).to.eq('erroremptymessage');
    });
    mensajes('debate').should('have.length', 1);
  });

  it('MOOD-CP-562 - un asunto de 256 caracteres se rechaza sin error de base de datos', () => {
    preparar('MOOD-CP-562');
    cy.then(() => llamar('mod_forum_add_discussion_post', {
      postid: datos.mensaje,
      subject: 'A'.repeat(256),
      message: 'Respuesta con un asunto largo',
    })).then((respuesta) => {
      expect(respuesta.exception).to.match(/invalid_parameter_exception$/);
      expect(respuesta.message).to.contain('255');
      expect(respuesta.message).not.to.match(/value too long|dml/i);
    });
    mensajes('debate').should('have.length', 1);
  });

  it('MOOD-CP-563 - descarga el adjunto del mensaje de la docente', () => {
    preparar('MOOD-CP-563');
    cy.then(() => debeServirSoloElArchivo(datos));
  });
});
