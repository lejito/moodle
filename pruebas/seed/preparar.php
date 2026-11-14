<?php
// This file is part of Moodle - http://moodle.org/
//
// Moodle is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// Moodle is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with Moodle.  If not, see <http://www.gnu.org/licenses/>.

/**
 * Deja el sitio sembrado en el estado que necesita un caso de prueba E2E.
 *
 * Cypress lo llama antes de cada caso (cy.task('preparar', 'MOOD-CP-114')). Primero devuelve la
 * funcionalidad del caso a como la dejó sembrar.php, deshaciendo lo que hayan cambiado los casos
 * anteriores, y después aplica la preparación propia del caso, la que dice la columna
 * "Preparación" de su documento de caja negra. Termina imprimiendo, en la última línea, un JSON
 * con lo que la prueba necesita saber: los IDs del curso y sus actividades, la clave y la
 * contraseña de los usuarios. Así las suites no copian los datos sembrados.
 *
 *   php pruebas/seed/preparar.php MOOD-CP-114
 *
 * Los casos de API (MOOD-CP-N51 en adelante) reutilizan la preparación de un caso E2E, la de
 * MISMA_PREPARACION, y leen de la salida los tokens del servicio web y los IDs de usuarios y
 * actividades.
 *
 * Requiere que el sitio esté sembrado (sembrar.php) y, para los tokens, servicios_web.php.
 *
 * @package    core
 * @copyright  2026 Juan Sebastian Ospina Lora
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

define('CLI_SCRIPT', true);

require(__DIR__ . '/../../config.php');
require_once($CFG->libdir . '/clilib.php');
require_once($CFG->dirroot . '/cohort/lib.php');
require_once($CFG->dirroot . '/group/lib.php');
require_once(__DIR__ . '/datos.php');

/** Prefijo de los usuarios de apoyo que crean algunos casos; se borran al restablecer. */
const PREFIJO_APOYO = 'apoyo.';
/** Grupo de los casos con claves de grupo (RF-MOOD-01). */
const GRUPO_A = 'Grupo A';
/** Clave del grupo A. */
const CLAVE_GRUPO_A = 'Grupo-A-2026';
/** Cohorte de los casos con restricción por cohorte (RF-MOOD-01). */
const COHORTE = 'Cohorte de laboratorio';
/** Servicio web de las pruebas de API, el que crea servicios_web.php. */
const SERVICIO = 'pruebas';

/**
 * Casos de API que parten del mismo estado que un caso E2E: usan su preparación. Los que no están
 * aquí parten del estado sembrado.
 */
const MISMA_PREPARACION = [
    'MOOD-CP-155' => 'MOOD-CP-106',
    'MOOD-CP-156' => 'MOOD-CP-110',
    'MOOD-CP-157' => 'MOOD-CP-111-fin',
    'MOOD-CP-158' => 'MOOD-CP-116',
    'MOOD-CP-254' => 'MOOD-CP-209',
    'MOOD-CP-255' => 'MOOD-CP-211',
    'MOOD-CP-256' => 'MOOD-CP-212',
    'MOOD-CP-257' => 'MOOD-CP-204',
    'MOOD-CP-258' => 'MOOD-CP-214',
    'MOOD-CP-259' => 'MOOD-CP-215',
    'MOOD-CP-357' => 'MOOD-CP-313',
    'MOOD-CP-381' => 'MOOD-CP-315',
    'MOOD-CP-359' => 'MOOD-CP-310',
    'MOOD-CP-455' => 'MOOD-CP-407',
    'MOOD-CP-456' => 'MOOD-CP-408',
    'MOOD-CP-457' => 'MOOD-CP-410',
    'MOOD-CP-458' => 'MOOD-CP-411',
    'MOOD-CP-459' => 'MOOD-CP-412',
    'MOOD-CP-554' => 'MOOD-CP-506',
    'MOOD-CP-555' => 'MOOD-CP-508',
    'MOOD-CP-556' => 'MOOD-CP-509',
    'MOOD-CP-557' => 'MOOD-CP-510',
    'MOOD-CP-558' => 'MOOD-CP-511',
    'MOOD-CP-559' => 'MOOD-CP-513',
    'MOOD-CP-560' => 'MOOD-CP-507',
];

[$opciones, $sueltos] = cli_get_params([], []);
$caso = $sueltos[0] ?? '';
// Un caso con dos preparaciones lleva un sufijo, como MOOD-CP-111-inicio y MOOD-CP-111-fin.
if (!preg_match('/^MOOD-CP-(\d)\d\d(-[a-z]+)?$/', $caso, $partes)) {
    cli_error('Uso: php pruebas/seed/preparar.php MOOD-CP-NNN[-variante]');
}

\core\session\manager::set_user(get_admin());
$curso = $DB->get_record('course', ['shortname' => CURSO_CORTO]);
if (!$curso) {
    cli_error('No está el curso ' . CURSO_CORTO . ': corre antes pruebas/seed/sembrar.php.');
}
$usuarios = [];
foreach (array_keys(USUARIOS) as $usuario) {
    $usuarios[$usuario] = $DB->get_record('user', ['username' => $usuario, 'deleted' => 0], '*', MUST_EXIST);
}

$preparacion = MISMA_PREPARACION[$caso] ?? $caso;
$datos = match ((int) $partes[1]) {
    1 => preparar_rf01($preparacion, $curso, $usuarios),
    2 => preparar_rf02($preparacion, $curso, $usuarios),
    3 => preparar_rf03($preparacion, $curso, $usuarios),
    4 => preparar_rf04($preparacion, $curso, $usuarios),
    5 => preparar_rf05($preparacion, $curso, $usuarios),
    default => cli_error("Todavía no hay preparación para los casos de RF-MOOD-0{$partes[1]}."),
};

cli_writeln(json_encode($datos + [
    'caso' => $caso,
    'curso' => (int) $curso->id,
    'contrasena' => CONTRASENA,
    'usuarios' => array_map(fn($usuario) => (int) $usuario->id, $usuarios),
    'tokens' => tokens($usuarios),
], JSON_UNESCAPED_UNICODE));

/**
 * Los tokens de los usuarios sembrados para el servicio web de las pruebas de API.
 *
 * Vacío si no se corrió servicios_web.php.
 *
 * @param stdClass[] $usuarios
 * @return array usuario => token
 */
function tokens(array $usuarios): array {
    global $DB;
    $servicio = $DB->get_field('external_services', 'id', ['shortname' => SERVICIO]);
    if (!$servicio) {
        return [];
    }
    $tokens = [];
    foreach ($usuarios as $nombre => $usuario) {
        $token = $DB->get_field('external_tokens', 'token',
            ['userid' => $usuario->id, 'externalserviceid' => $servicio], IGNORE_MULTIPLE);
        if ($token) {
            $tokens[$nombre] = $token;
        }
    }
    return $tokens;
}

/**
 * RF-MOOD-01, automatricularse con clave.
 *
 * @param string $caso
 * @param stdClass $curso
 * @param stdClass[] $usuarios
 * @return array
 */
function preparar_rf01(string $caso, stdClass $curso, array $usuarios): array {
    global $DB;
    $plugin = enrol_get_plugin('self');
    $instancia = $DB->get_record('enrol', ['courseid' => $curso->id, 'enrol' => 'self'], '*', MUST_EXIST);

    // Lo sembrado: activa, admite matrículas nuevas, sin fechas, sin cupo, sin cohorte, sin
    // claves de grupo, sin pista, sin mensaje de bienvenida, y estudiante.b sin matricular.
    $DB->update_record('enrol', (object) [
        'id' => $instancia->id,
        'status' => ENROL_INSTANCE_ENABLED,
        'password' => CLAVE_MATRICULA,
        'customint1' => 0,
        'customint3' => 0,
        'customint5' => 0,
        'customint4' => 0, // Sin mensaje de bienvenida: el sitio no envía correos.
        'customint6' => 1,
        'enrolstartdate' => 0,
        'enrolenddate' => 0,
    ]);
    set_config('showhint', 0, 'enrol_self');
    foreach (enrol_get_instances($curso->id, false) as $otra) {
        enrol_get_plugin($otra->enrol)->unenrol_user($otra, $usuarios['estudiante.b']->id);
    }
    if ($grupo = groups_get_group_by_name($curso->id, GRUPO_A)) {
        groups_delete_group($grupo);
    }
    if ($cohorte = $DB->get_record('cohort', ['name' => COHORTE])) {
        cohort_delete_cohort($cohorte);
    }
    borrar_usuarios_de_apoyo();
    $instancia = $DB->get_record('enrol', ['id' => $instancia->id]);

    $cambios = [];
    switch ($caso) {
        case 'MOOD-CP-106':
            set_config('showhint', 1, 'enrol_self');
            break;
        case 'MOOD-CP-107':
            $cambios['customint1'] = 1;
            groups_create_group((object) [
                'courseid' => $curso->id,
                'name' => GRUPO_A,
                'enrolmentkey' => CLAVE_GRUPO_A,
            ]);
            break;
        case 'MOOD-CP-109':
            $cambios['customint6'] = 0;
            break;
        case 'MOOD-CP-110':
            $cambios['status'] = ENROL_INSTANCE_DISABLED;
            break;
        case 'MOOD-CP-111-inicio':
            $cambios['enrolstartdate'] = time() + DAYSECS;
            break;
        case 'MOOD-CP-111-fin':
            $cambios['enrolenddate'] = time() - DAYSECS;
            break;
        case 'MOOD-CP-114':
        case 'MOOD-CP-115':
            $cambios['customint3'] = 2;
            $ocupados = $caso === 'MOOD-CP-114' ? 1 : 2;
            $estudiante = $DB->get_field('role', 'id', ['shortname' => 'student']);
            for ($i = 1; $i <= $ocupados; $i++) {
                $plugin->enrol_user($instancia, crear_usuario_de_apoyo($i)->id, $estudiante);
            }
            break;
        case 'MOOD-CP-116':
        case 'MOOD-CP-117':
            $cohorte = cohort_add_cohort((object) [
                'contextid' => context_system::instance()->id,
                'name' => COHORTE,
                'idnumber' => '',
            ]);
            if ($caso === 'MOOD-CP-117') {
                cohort_add_member($cohorte, $usuarios['estudiante.b']->id);
            }
            $cambios['customint5'] = $cohorte;
            break;
    }
    if ($cambios) {
        $DB->update_record('enrol', (object) (['id' => $instancia->id] + $cambios));
    }

    return [
        'instancia' => (int) $instancia->id,
        'clave' => CLAVE_MATRICULA,
        'claveGrupo' => CLAVE_GRUPO_A,
        'grupo' => GRUPO_A,
        'cohorte' => COHORTE,
    ];
}

/**
 * RF-MOOD-02, entregar una tarea.
 *
 * Restablece la «Tarea de laboratorio» como la sembró sembrar.php (abrió ayer, vence en 7 días,
 * corta en 14, sin límite de palabras ni declaración) y sin entregas, notas, prórrogas ni
 * bloqueos de nadie.
 *
 * @param string $caso
 * @param stdClass $curso
 * @param stdClass[] $usuarios
 * @return array
 */
function preparar_rf02(string $caso, stdClass $curso, array $usuarios): array {
    global $DB;
    $ahora = time();
    $estudiante = $usuarios['estudiante.a'];
    $registro = $DB->get_record('assign', ['course' => $curso->id, 'name' => TAREA], '*', MUST_EXIST);

    $fechas = [
        'allowsubmissionsfromdate' => $ahora - DAYSECS,
        'duedate' => $ahora + 7 * DAYSECS,
        'cutoffdate' => $ahora + 14 * DAYSECS,
    ];
    $ajustes = ['requiresubmissionstatement' => 0, 'markingworkflow' => 0];
    $palabras = 0;
    $tiposdearchivo = '';
    $entrega = null;
    $bloquear = false;
    $prorroga = 0;
    switch ($caso) {
        case 'MOOD-CP-203':
        case 'MOOD-CP-204':
            $palabras = 10;
            break;
        case 'MOOD-CP-209':
            $fechas['allowsubmissionsfromdate'] = $ahora + DAYSECS;
            break;
        case 'MOOD-CP-210':
            $fechas['duedate'] = $ahora - DAYSECS;
            $fechas['cutoffdate'] = $ahora + 7 * DAYSECS;
            break;
        case 'MOOD-CP-211':
        case 'MOOD-CP-212':
            $fechas['allowsubmissionsfromdate'] = $ahora - 7 * DAYSECS;
            $fechas['duedate'] = $ahora - DAYSECS;
            $fechas['cutoffdate'] = $ahora - DAYSECS;
            if ($caso === 'MOOD-CP-212') {
                $prorroga = $ahora + DAYSECS;
            }
            break;
        case 'MOOD-CP-213':
            $entrega = 'enviada';
            break;
        case 'MOOD-CP-214':
            $entrega = 'borrador';
            $bloquear = true;
            break;
        case 'MOOD-CP-215':
        case 'MOOD-CP-216':
            $ajustes['requiresubmissionstatement'] = 1;
            $entrega = 'borrador';
            break;
        case 'MOOD-CP-282':
            // Seguridad: solo se aceptan PDF y texto plano.
            $tiposdearchivo = '.pdf,.txt';
            break;
    }
    $DB->update_record('assign', (object) (['id' => $registro->id] + $fechas + $ajustes));
    rebuild_course_cache($curso->id, true);

    $tarea = tarea($registro->id, $curso);
    $tarea->reset_userdata((object) [
        'courseid' => $curso->id,
        'reset_assign_submissions' => 1,
        'reset_gradebook_grades' => 1,
        'reset_assign_user_overrides' => 1,
        'timeshift' => 0,
    ]);
    $texto = $tarea->get_submission_plugin_by_type('onlinetext');
    $texto->set_config('wordlimitenabled', $palabras ? 1 : 0);
    $texto->set_config('wordlimit', $palabras);
    $tarea->get_submission_plugin_by_type('file')->set_config('filetypeslist', $tiposdearchivo);

    $tarea = tarea($registro->id, $curso);
    if ($entrega) {
        \core\session\manager::set_user($estudiante);
        $datos = (object) [
            'userid' => $estudiante->id,
            'onlinetext_editor' => [
                'itemid' => file_get_unused_draft_itemid(),
                'text' => 'Entrega preparada para el caso ' . $caso,
                'format' => FORMAT_HTML,
            ],
        ];
        $tarea->save_submission($datos, $avisos);
        if ($entrega === 'enviada') {
            $tarea->submit_for_grading((object) ['userid' => $estudiante->id], []);
        }
        \core\session\manager::set_user(get_admin());
    }
    if ($bloquear) {
        $tarea->lock_submission($estudiante->id);
    }
    if ($prorroga) {
        $tarea->save_user_extension($estudiante->id, $prorroga);
    }

    return [
        'tarea' => (int) $tarea->get_course_module()->id,
        'idTarea' => (int) $registro->id,
        'nombreTarea' => TAREA,
    ];
}

/**
 * RF-MOOD-03, calificar una entrega.
 *
 * Parte de la tarea restablecida de RF-MOOD-02 (sin entregas ni notas, sin flujo de calificación)
 * y, salvo en los casos que dicen otra cosa, con un texto de estudiante.a enviado para calificar.
 *
 * @param string $caso
 * @param stdClass $curso
 * @param stdClass[] $usuarios
 * @return array
 */
function preparar_rf03(string $caso, stdClass $curso, array $usuarios): array {
    global $CFG, $DB;
    require_once($CFG->libdir . '/gradelib.php');
    borrar_usuarios_de_apoyo();
    $datos = preparar_rf02('MOOD-CP-213', $curso, $usuarios);
    $registro = $DB->get_record('assign', ['course' => $curso->id, 'name' => TAREA], '*', MUST_EXIST);
    $estudiante = $usuarios['estudiante.a'];

    if ($caso === 'MOOD-CP-309' || $caso === 'MOOD-CP-314') {
        // Sin entrega: se restablece otra vez sin el texto enviado.
        $datos = preparar_rf02('MOOD-CP-201', $curso, $usuarios);
    }
    if ($caso === 'MOOD-CP-312') {
        $DB->set_field('assign', 'markingworkflow', 1, ['id' => $registro->id]);
    }

    $tarea = tarea($registro->id, $curso);
    $calificar = function (int $userid, float $nota) use ($tarea, $usuarios): void {
        \core\session\manager::set_user($usuarios['docente']);
        $tarea->save_grade($userid, (object) ['grade' => $nota, 'attemptnumber' => -1]);
        \core\session\manager::set_user(get_admin());
    };
    $apoyo = null;
    switch ($caso) {
        case 'MOOD-CP-310':
            $calificar($estudiante->id, 80);
            break;
        case 'MOOD-CP-313':
            $calificar($estudiante->id, 60);
            $item = grade_item::fetch([
                'courseid' => $curso->id,
                'itemtype' => 'mod',
                'itemmodule' => 'assign',
                'iteminstance' => $registro->id,
                'itemnumber' => 0,
            ]);
            grade_grade::fetch(['itemid' => $item->id, 'userid' => $estudiante->id])->set_locked(1);
            break;
        case 'MOOD-CP-315':
            $apoyo = crear_usuario_de_apoyo(1);
            enrol_try_internal_enrol($curso->id, $apoyo->id, $DB->get_field('role', 'id', ['shortname' => 'student']));
            $calificar($apoyo->id, 50);
            break;
    }

    return $datos + [
        'estudiante' => (int) $estudiante->id,
        'apoyo' => $apoyo ? (int) $apoyo->id : null,
    ];
}

/**
 * RF-MOOD-04, presentar un cuestionario.
 *
 * Restablece el «Cuestionario de laboratorio» como lo sembró sembrar.php (abrió ayer, cierra en 7
 * días, 2 intentos, sin contraseña ni tiempo límite) y sin intentos de nadie, ni vistas previas.
 *
 * @param string $caso
 * @param stdClass $curso
 * @param stdClass[] $usuarios
 * @return array
 */
function preparar_rf04(string $caso, stdClass $curso, array $usuarios): array {
    global $CFG, $DB;
    require_once($CFG->dirroot . '/mod/quiz/lib.php');
    require_once($CFG->dirroot . '/mod/quiz/locallib.php');
    require_once($CFG->libdir . '/testing/generator/lib.php');
    $ahora = time();
    $quiz = $DB->get_record('quiz', ['course' => $curso->id, 'name' => CUESTIONARIO], '*', MUST_EXIST);

    $ajustes = [
        'timeopen' => $ahora - DAYSECS,
        'timeclose' => $ahora + 7 * DAYSECS,
        'attempts' => 2,
        'timelimit' => 0,
        'overduehandling' => 'autosubmit',
    ];
    $contrasena = '';
    switch ($caso) {
        case 'MOOD-CP-407':
            $ajustes['timeopen'] = $ahora + DAYSECS;
            break;
        case 'MOOD-CP-408':
            $ajustes['timeopen'] = $ahora - 7 * DAYSECS;
            $ajustes['timeclose'] = $ahora - DAYSECS;
            break;
        case 'MOOD-CP-411':
        case 'MOOD-CP-412':
            $contrasena = 'Quiz-2026';
            break;
        case 'MOOD-CP-414':
            $ajustes['timelimit'] = MINSECS;
            break;
    }
    $ajustes['password'] = $contrasena;
    $DB->update_record('quiz', (object) (['id' => $quiz->id] + $ajustes));
    rebuild_course_cache($curso->id, true);
    quiz_delete_all_attempts($DB->get_record('quiz', ['id' => $quiz->id]));

    $intentoajeno = null;
    if ($caso === 'MOOD-CP-481') {
        // Seguridad: un intento terminado de otro estudiante, que estudiante.a no debe poder ver.
        borrar_usuarios_de_apoyo();
        $apoyo = crear_usuario_de_apoyo(1);
        enrol_try_internal_enrol($curso->id, $apoyo->id, $DB->get_field('role', 'id', ['shortname' => 'student']));
        $generador = (new testing_data_generator())->get_plugin_generator('mod_quiz');
        \core\session\manager::set_user($apoyo);
        $intento = $generador->create_attempt($quiz->id, $apoyo->id);
        \mod_quiz\quiz_attempt::create($intento->id)->process_submit(time(), false);
        \mod_quiz\quiz_attempt::create($intento->id)->process_grade_submission(time());
        \core\session\manager::set_user(get_admin());
        $intentoajeno = (int) $intento->id;
    }

    if ($caso === 'MOOD-CP-410') {
        // Los dos intentos permitidos, ya terminados.
        $generador = (new testing_data_generator())->get_plugin_generator('mod_quiz');
        $estudiante = $usuarios['estudiante.a'];
        \core\session\manager::set_user($estudiante);
        for ($i = 0; $i < 2; $i++) {
            $intento = $generador->create_attempt($quiz->id, $estudiante->id);
            \mod_quiz\quiz_attempt::create($intento->id)->process_submit(time(), false);
            \mod_quiz\quiz_attempt::create($intento->id)->process_grade_submission(time());
        }
        \core\session\manager::set_user(get_admin());
    }

    $cm = get_coursemodule_from_instance('quiz', $quiz->id, $curso->id, false, MUST_EXIST);
    return [
        'cuestionario' => (int) $cm->id,
        'idCuestionario' => (int) $quiz->id,
        'contrasenaCuestionario' => 'Quiz-2026',
        'intentoAjeno' => $intentoajeno,
    ];
}

/**
 * RF-MOOD-05, participar en un foro.
 *
 * Restablece el «Foro de laboratorio» como lo sembró sembrar.php: general, sin fechas, sin grupos
 * ni bloqueo por inactividad, con solo el «Debate inicial» del docente (sin respuestas, sin
 * bloquear) y sin cambios de permisos. También vacía el foro de avisos y borra los grupos.
 *
 * @param string $caso
 * @param stdClass $curso
 * @param stdClass[] $usuarios
 * @return array
 */
function preparar_rf05(string $caso, stdClass $curso, array $usuarios): array {
    global $CFG, $DB;
    require_once($CFG->dirroot . '/mod/forum/lib.php');
    require_once($CFG->libdir . '/testing/generator/lib.php');
    $generador = (new testing_data_generator())->get_plugin_generator('mod_forum');
    $ahora = time();
    $docente = $usuarios['docente'];
    $estudiante = $usuarios['estudiante.a'];
    $rolestudiante = $DB->get_field('role', 'id', ['shortname' => 'student']);

    $foro = $DB->get_record('forum', ['course' => $curso->id, 'name' => FORO], '*', MUST_EXIST);
    $cm = get_coursemodule_from_instance('forum', $foro->id, $curso->id, false, MUST_EXIST);
    $contexto = context_module::instance($cm->id);

    // El foro y su debate, como los sembró sembrar.php.
    $DB->update_record('forum', (object) [
        'id' => $foro->id,
        'duedate' => 0,
        'cutoffdate' => 0,
        'lockdiscussionafter' => 0,
    ]);
    \core_courseformat\formatactions::cm($curso)->set_groupmode($cm->id, NOGROUPS);
    unassign_capability('mod/forum:replypost', $rolestudiante, $contexto->id);
    borrar_usuarios_de_apoyo();
    foreach ([GRUPO_A, 'Grupo B'] as $nombre) {
        if ($grupo = groups_get_group_by_name($curso->id, $nombre)) {
            groups_delete_group($grupo);
        }
    }
    $foro = $DB->get_record('forum', ['id' => $foro->id]);
    foreach ($DB->get_records('forum_discussions', ['forum' => $foro->id]) as $debate) {
        if ($debate->name === DEBATE) {
            $inicial = $debate;
            continue;
        }
        forum_delete_discussion($debate, true, $curso, $cm, $foro);
    }
    foreach ($DB->get_records('forum_posts', ['discussion' => $inicial->id]) as $post) {
        if ($post->id != $inicial->firstpost && $DB->record_exists('forum_posts', ['id' => $post->id])) {
            forum_delete_post($post, true, $curso, $cm, $foro, true);
        }
    }
    $DB->update_record('forum_discussions', (object) [
        'id' => $inicial->id,
        'timelocked' => 0,
        'timemodified' => $ahora,
    ]);
    $avisos = forum_get_course_forum($curso->id, 'news');
    $cmavisos = get_coursemodule_from_instance('forum', $avisos->id, $curso->id, false, MUST_EXIST);
    foreach ($DB->get_records('forum_discussions', ['forum' => $avisos->id]) as $debate) {
        forum_delete_discussion($debate, true, $curso, $cmavisos, $avisos);
    }

    $datos = [
        'foro' => (int) $cm->id,
        'debate' => (int) $inicial->id,
        'mensaje' => (int) $inicial->firstpost,
        'nombreDebate' => DEBATE,
    ];
    $grupo = function (string $nombre, array $miembros) use ($curso): int {
        $id = groups_create_group((object) ['courseid' => $curso->id, 'name' => $nombre]);
        foreach ($miembros as $miembro) {
            groups_add_member($id, $miembro);
        }
        return $id;
    };
    switch ($caso) {
        case 'MOOD-CP-506':
            $aviso = $generador->create_discussion([
                'course' => $curso->id,
                'forum' => $avisos->id,
                'userid' => $docente->id,
                'name' => 'Aviso del laboratorio',
                'message' => 'Mañana no hay clase.',
            ]);
            $datos['aviso'] = (int) $aviso->id;
            $datos['mensajeAviso'] = (int) $aviso->firstpost;
            break;
        case 'MOOD-CP-507':
            $DB->update_record('forum', (object) [
                'id' => $foro->id,
                'duedate' => $ahora - DAYSECS,
                'cutoffdate' => $ahora + 7 * DAYSECS,
            ]);
            break;
        case 'MOOD-CP-508':
            $DB->set_field('forum', 'cutoffdate', $ahora - DAYSECS, ['id' => $foro->id]);
            break;
        case 'MOOD-CP-509':
            $DB->set_field('forum_discussions', 'timelocked', $ahora, ['id' => $inicial->id]);
            break;
        case 'MOOD-CP-510':
            $DB->set_field('forum', 'lockdiscussionafter', DAYSECS, ['id' => $foro->id]);
            $DB->set_field('forum_discussions', 'timemodified', $ahora - 2 * DAYSECS, ['id' => $inicial->id]);
            break;
        case 'MOOD-CP-511':
        case 'MOOD-CP-512':
            \core_courseformat\formatactions::cm($curso)->set_groupmode($cm->id, SEPARATEGROUPS);
            $grupoa = $grupo(GRUPO_A, [$estudiante->id]);
            $grupob = $grupo('Grupo B', []);
            $debate = $generador->create_discussion([
                'course' => $curso->id,
                'forum' => $foro->id,
                'userid' => $docente->id,
                'groupid' => $caso === 'MOOD-CP-511' ? $grupob : $grupoa,
                'name' => 'Debate de grupo',
                'message' => 'Debate solo para un grupo.',
            ]);
            $datos['debateGrupo'] = (int) $debate->id;
            $datos['mensajeGrupo'] = (int) $debate->firstpost;
            break;
        case 'MOOD-CP-513':
            assign_capability('mod/forum:replypost', CAP_PREVENT, $rolestudiante, $contexto->id, true);
            break;
        case 'MOOD-CP-581':
        case 'MOOD-CP-582':
            // Seguridad: el mensaje de la docente, reciente, para que el plazo de edición (30 minutos)
            // no sea la razón del rechazo y se compruebe el permiso.
            $DB->update_record('forum_posts', (object) ['id' => $inicial->firstpost, 'created' => $ahora, 'modified' => $ahora]);
            break;
        case 'MOOD-CP-514':
            $apoyo = crear_usuario_de_apoyo(1);
            enrol_try_internal_enrol($curso->id, $apoyo->id, $rolestudiante);
            $respuesta = $generador->create_post([
                'discussion' => $inicial->id,
                'parent' => $inicial->firstpost,
                'userid' => $estudiante->id,
                'subject' => 'Re: ' . DEBATE,
                'message' => 'Mi respuesta al debate.',
            ]);
            $generador->create_post([
                'discussion' => $inicial->id,
                'parent' => $respuesta->id,
                'userid' => $docente->id,
                'subject' => 'Re: ' . DEBATE,
                'message' => 'Respuesta privada del docente.',
                'privatereplyto' => $estudiante->id,
            ]);
            break;
    }
    rebuild_course_cache($curso->id, true);
    return $datos;
}

/**
 * La tarea, recién leída de la base (para que vea los cambios de la preparación).
 *
 * @param int $id
 * @param stdClass $curso
 * @return assign
 */
function tarea(int $id, stdClass $curso): assign {
    global $CFG;
    require_once($CFG->dirroot . '/mod/assign/locallib.php');
    $cm = get_coursemodule_from_instance('assign', $id, $curso->id, false, MUST_EXIST);
    return new assign(context_module::instance($cm->id), $cm, $curso);
}

/**
 * Crea un usuario de apoyo (apoyo.N), con la contraseña de los demás.
 *
 * @param int $numero
 * @return stdClass
 */
function crear_usuario_de_apoyo(int $numero): stdClass {
    global $CFG;
    require_once($CFG->libdir . '/testing/generator/lib.php');
    return (new testing_data_generator())->create_user([
        'username' => PREFIJO_APOYO . $numero,
        'password' => CONTRASENA,
        'firstname' => 'Apoyo',
        'lastname' => (string) $numero,
    ]);
}

/**
 * Borra los usuarios de apoyo de casos anteriores.
 */
function borrar_usuarios_de_apoyo(): void {
    global $DB;
    $apoyo = $DB->get_records_select('user', 'deleted = 0 AND ' . $DB->sql_like('username', ':prefijo'),
        ['prefijo' => PREFIJO_APOYO . '%']);
    foreach ($apoyo as $usuario) {
        delete_user($usuario);
    }
}
