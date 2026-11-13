// RF-MOOD-05 · Participar en un foro.
//
// Casos de caja negra MOOD-CP-501 a 514 (515, el corte al segundo, está en PHPUnit). Cada caso
// empieza con preparar.php, que deja el foro sembrado con solo el «Debate inicial» del docente.
// Lo hace estudiante.a, matriculado como estudiante.

describe('RF-MOOD-05 · Participar en un foro', () => {
  let datos;

  /** Prepara el caso, inicia sesión y abre el debate inicial (o el que se indique). */
  const prepararYAbrir = (caso, { usuario = 'estudiante.a', debate = 'debate' } = {}) => {
    cy.preparar(caso).then((d) => {
      datos = d;
      cy.iniciarSesion(usuario, d.contrasena);
      cy.abrir(`/mod/forum/discuss.php?d=${d[debate]}`);
    });
  };

  /** El botón "Reply" de los mensajes del debate. */
  const botonResponder = () => cy.get('[data-region="post"]').find('a, button').filter(':contains("Reply")');

  /** Abre la respuesta rápida al mensaje del docente y escribe el texto. */
  const responderRapido = (texto) => {
    botonResponder().first().click();
    cy.get('form[data-content="inpage-reply-form"] textarea').should('be.visible').type(texto);
  };

  /** Abre el formulario completo de respuesta al mensaje del docente ("Reply" y luego "Advanced"). */
  const abrirFormularioCompleto = () => {
    botonResponder().first().click();
    cy.get('form[data-content="inpage-reply-form"]').contains('button, a', 'Advanced').click();
    cy.esperarMoodle();
    cy.location('pathname').should('eq', '/mod/forum/post.php');
  };

  /**
   * En el formulario completo, deja el mensaje y el asunto dados y publica. El asunto va al final:
   * Moodle lo valida en el navegador al salir del campo y, si no es válido, le devuelve el foco, así
   * que lo que se escribiera después caería en el asunto.
   */
  const publicarCompleto = ({ asunto, mensaje }) => {
    cy.get('textarea[name="message[text]"]').clear();
    if (mensaje) {
      cy.get('textarea[name="message[text]"]').type(mensaje);
    }
    if (asunto !== undefined) {
      cy.get('input[name="subject"]').clear();
      if (asunto) {
        cy.get('input[name="subject"]').type(asunto, { delay: 0 });
      }
    }
    cy.contains('button, input[type="submit"]', 'Post to forum').click();
    cy.esperarMoodle();
  };

  /** Comprueba que no hay forma de responder en la página. */
  const debeImpedirResponder = () => {
    cy.get('[data-region="post"]').should('exist');
    botonResponder().should('not.exist');
  };

  it('MOOD-CP-501 - consulta el debate y responde', () => {
    cy.preparar('MOOD-CP-501').then((d) => {
      datos = d;
      cy.iniciarSesion('estudiante.a', d.contrasena);
      cy.abrir(`/mod/forum/view.php?id=${d.foro}`);
    });
    cy.contains('a', 'Debate inicial').click();
    cy.esperarMoodle();
    cy.contains('¿Qué esperan aprender en este curso?').should('be.visible');

    responderRapido('Espero aprender a diseñar pruebas');
    cy.get('form[data-content="inpage-reply-form"]').contains('button', 'Post to forum').click();
    cy.contains('[data-region="post"]', 'Espero aprender a diseñar pruebas')
      .should('contain', 'Ana Estudiante')
      .and('contain', 'Debate inicial');
  });

  it('MOOD-CP-502 - no publica una respuesta sin mensaje', () => {
    prepararYAbrir('MOOD-CP-502');
    abrirFormularioCompleto();
    publicarCompleto({ mensaje: '' });
    cy.contains(/Required|Post message cannot be empty/).should('be.visible');
    cy.location('pathname').should('eq', '/mod/forum/post.php');
  });

  it('MOOD-CP-503 - no publica una respuesta sin asunto', () => {
    prepararYAbrir('MOOD-CP-503');
    abrirFormularioCompleto();
    publicarCompleto({ asunto: '', mensaje: 'Respuesta sin asunto' });
    cy.contains(/Required|Post subject cannot be empty/).should('be.visible');
    cy.location('pathname').should('eq', '/mod/forum/post.php');
  });

  it('MOOD-CP-504 - publica con un asunto de 255 caracteres', () => {
    const asunto = 'A'.repeat(255);
    prepararYAbrir('MOOD-CP-504');
    abrirFormularioCompleto();
    publicarCompleto({ asunto, mensaje: 'Asunto en el límite' });
    cy.location('pathname').should('eq', '/mod/forum/discuss.php');
    cy.contains('[data-region="post"]', 'Asunto en el límite').should('contain', asunto);
  });

  it('MOOD-CP-505 - rechaza un asunto de 256 caracteres', () => {
    prepararYAbrir('MOOD-CP-505');
    abrirFormularioCompleto();
    publicarCompleto({ asunto: 'A'.repeat(256), mensaje: 'Asunto por encima del límite' });
    cy.contains('Maximum of 255 characters').should('be.visible');
    cy.location('pathname').should('eq', '/mod/forum/post.php');
  });

  it('MOOD-CP-506 - en el foro de avisos se lee pero no se responde', () => {
    prepararYAbrir('MOOD-CP-506', { debate: 'aviso' });
    cy.contains('Mañana no hay clase.').should('be.visible');
    debeImpedirResponder();
  });

  it('MOOD-CP-507 - después del vencimiento avisa, pero deja responder', () => {
    prepararYAbrir('MOOD-CP-507');
    cy.contains('The due date for posting to this forum was').should('be.visible');
    responderRapido('Respuesta después del vencimiento');
    cy.get('form[data-content="inpage-reply-form"]').contains('button', 'Post to forum').click();
    cy.contains('[data-region="post"]', 'Respuesta después del vencimiento').should('exist');
  });

  it('MOOD-CP-508 - después del corte no deja responder', () => {
    prepararYAbrir('MOOD-CP-508');
    cy.contains('The cut-off date for posting to this forum is reached so you can no longer post to it.')
      .should('be.visible');
    debeImpedirResponder();
  });

  it('MOOD-CP-509 - un debate bloqueado por el docente no deja responder', () => {
    prepararYAbrir('MOOD-CP-509');
    cy.contains('This discussion has been locked so you can no longer reply to it.').should('be.visible');
    debeImpedirResponder();
  });

  it('MOOD-CP-510 - un debate bloqueado por inactividad no deja responder', () => {
    prepararYAbrir('MOOD-CP-510');
    cy.contains('This discussion has been locked so you can no longer reply to it.').should('be.visible');
    debeImpedirResponder();
  });

  it('MOOD-CP-511 - con grupos separados, el debate de otro grupo no se ve', () => {
    cy.preparar('MOOD-CP-511').then((d) => {
      datos = d;
      cy.iniciarSesion('estudiante.a', d.contrasena);
      cy.abrir(`/mod/forum/view.php?id=${d.foro}`);
    });
    cy.contains('a', 'Debate de grupo').should('not.exist');
    cy.then(() => cy.visit(`/mod/forum/discuss.php?d=${datos.debateGrupo}`, { failOnStatusCode: false }));
    cy.contains('Debate solo para un grupo.').should('not.exist');
    cy.get('[data-region="post"]').should('not.exist');
  });

  it('MOOD-CP-512 - con grupos separados, responde en el debate de su grupo', () => {
    prepararYAbrir('MOOD-CP-512', { debate: 'debateGrupo' });
    cy.contains('Debate solo para un grupo.').should('be.visible');
    responderRapido('Respuesta en mi grupo');
    cy.get('form[data-content="inpage-reply-form"]').contains('button', 'Post to forum').click();
    cy.contains('[data-region="post"]', 'Respuesta en mi grupo').should('exist');
  });

  it('MOOD-CP-513 - sin el permiso de responder, lee pero no responde', () => {
    prepararYAbrir('MOOD-CP-513');
    cy.contains('¿Qué esperan aprender en este curso?').should('be.visible');
    debeImpedirResponder();
  });

  it('MOOD-CP-514 - la respuesta privada la ve solo su destinatario, y no se responde', () => {
    prepararYAbrir('MOOD-CP-514');
    cy.contains('[data-region="post"]', 'Respuesta privada del docente.')
      .should('contain', 'This is a private reply.')
      .within(() => {
        cy.contains('a, button', /^Reply$/).should('not.exist');
      });

    cy.then(() => cy.iniciarSesion('apoyo.1', datos.contrasena));
    cy.then(() => cy.abrir(`/mod/forum/discuss.php?d=${datos.debate}`));
    cy.contains('Mi respuesta al debate.').should('be.visible');
    cy.contains('Respuesta privada del docente.').should('not.exist');
  });
});
