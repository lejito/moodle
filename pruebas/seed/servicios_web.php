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
 * Habilita la API REST para las pruebas de API: servicio, funciones y un token por usuario sembrado.
 *
 * Activa los servicios web y el protocolo REST, permite usarlo a los usuarios autenticados, crea el
 * servicio "pruebas" con las funciones de las cinco funcionalidades y genera un token para cada
 * usuario de la siembra. Los tokens quedan en pruebas/reportes/servicios-web.json, que git ignora.
 *
 * Se corre después de sembrar.php y se puede repetir: regenera los tokens.
 *
 *   docker compose run --rm moodle php pruebas/seed/servicios_web.php
 *
 * @package    core
 * @copyright  2026 Juan Sebastian Ospina Lora
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

define('CLI_SCRIPT', true);

require(__DIR__ . '/../../config.php');
require_once($CFG->libdir . '/clilib.php');
require_once($CFG->dirroot . '/webservice/lib.php');

const SERVICIO = 'pruebas';
const USUARIOS = ['estudiante.a', 'estudiante.b', 'docente'];
const FUNCIONES = [
    // Comunes.
    'core_webservice_get_site_info',
    'core_course_get_contents',
    'core_enrol_get_users_courses',
    // RF-MOOD-01: automatricularse con clave.
    'core_enrol_get_course_enrolment_methods',
    'enrol_self_get_instance_info',
    'enrol_self_enrol_user',
    // RF-MOOD-02 y 03: entregar y calificar una tarea.
    'mod_assign_get_assignments',
    'mod_assign_get_submission_status',
    'mod_assign_save_submission',
    'mod_assign_submit_for_grading',
    'mod_assign_save_grade',
    'mod_assign_submit_grading_form',
    'mod_assign_get_grades',
    // RF-MOOD-04: presentar un cuestionario.
    'mod_quiz_get_quizzes_by_courses',
    'mod_quiz_get_quiz_access_information',
    'mod_quiz_start_attempt',
    'mod_quiz_get_attempt_data',
    'mod_quiz_process_attempt',
    'mod_quiz_get_attempt_review',
    // RF-MOOD-05: participar en un foro.
    'mod_forum_get_forums_by_courses',
    'mod_forum_get_forum_discussions',
    'mod_forum_get_discussion_posts',
    'mod_forum_add_discussion_post',
];

\core\session\manager::set_user(get_admin());
$syscontext = context_system::instance();

// 1. Servicios web y protocolo REST.
set_config('enablewebservices', 1);
$protocolos = array_filter(explode(',', (string) get_config('core', 'webserviceprotocols')));
if (!in_array('rest', $protocolos)) {
    $protocolos[] = 'rest';
    set_config('webserviceprotocols', implode(',', $protocolos));
}
// Ningún rol trae por defecto el permiso de usar REST.
assign_capability('webservice/rest:use', CAP_ALLOW, $CFG->defaultuserroleid, $syscontext->id, true);

// 2. El servicio con sus funciones.
$webservice = new webservice();
$servicio = $webservice->get_external_service_by_shortname(SERVICIO);
if (!$servicio) {
    $id = $webservice->add_external_service((object) [
        'name' => 'Pruebas del proyecto',
        'shortname' => SERVICIO,
        'enabled' => 1,
        'restrictedusers' => 0,
        'downloadfiles' => 1,
        'uploadfiles' => 1,
    ]);
    $servicio = $DB->get_record('external_services', ['id' => $id], '*', MUST_EXIST);
}
foreach (FUNCIONES as $funcion) {
    if (!$DB->record_exists('external_functions', ['name' => $funcion])) {
        cli_problem("La función $funcion no existe en este Moodle; se omite.");
        continue;
    }
    if (!$DB->record_exists('external_services_functions', ['externalserviceid' => $servicio->id, 'functionname' => $funcion])) {
        $webservice->add_external_function_to_service($funcion, $servicio->id);
    }
}

// 3. Un token por usuario, regenerado en cada corrida.
$tokens = [];
foreach (USUARIOS as $usuario) {
    $user = $DB->get_record('user', ['username' => $usuario, 'deleted' => 0], '*', MUST_EXIST);
    $DB->delete_records('external_tokens', ['userid' => $user->id, 'externalserviceid' => $servicio->id]);
    $tokens[$usuario] = \core_external\util::generate_token(
        EXTERNAL_TOKEN_PERMANENT, $servicio, $user->id, $syscontext, 0, '', 'Pruebas del proyecto');
}

// 4. Lo que necesitan las suites de pruebas.
$datos = [
    'url' => $CFG->wwwroot,
    'endpoint' => $CFG->wwwroot . '/webservice/rest/server.php',
    'servicio' => SERVICIO,
    'tokens' => $tokens,
];
$carpeta = __DIR__ . '/../reportes';
check_dir_exists($carpeta);
file_put_contents("$carpeta/servicios-web.json", json_encode($datos, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . "\n");

cli_writeln('API REST lista.');
cli_writeln('  Endpoint:   ' . $datos['endpoint']);
cli_writeln('  Funciones:  ' . $DB->count_records('external_services_functions', ['externalserviceid' => $servicio->id]));
cli_writeln('  Tokens:     ' . implode(', ', array_keys($tokens)) . ' (en pruebas/reportes/servicios-web.json)');
