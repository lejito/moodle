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
 * Requiere que el sitio esté sembrado (sembrar.php).
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

$datos = match ((int) $partes[1]) {
    1 => preparar_rf01($caso, $curso, $usuarios),
    2 => preparar_rf02($caso, $curso, $usuarios),
    default => cli_error("Todavía no hay preparación para los casos de RF-MOOD-0{$partes[1]}."),
};

cli_writeln(json_encode($datos + [
    'caso' => $caso,
    'curso' => (int) $curso->id,
    'contrasena' => CONTRASENA,
], JSON_UNESCAPED_UNICODE));

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
    $ajustes = ['requiresubmissionstatement' => 0];
    $palabras = 0;
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
        'nombreTarea' => TAREA,
    ];
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
