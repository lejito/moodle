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
