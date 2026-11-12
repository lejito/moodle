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
 * Siembra los datos de las pruebas manuales, E2E, de accesibilidad y de seguridad.
 *
 * Crea un curso de laboratorio con lo que necesitan las cinco funcionalidades:
 * automatriculación con clave (RF-MOOD-01), una tarea para entregar y calificar
 * (RF-MOOD-02 y 03), un cuestionario (RF-MOOD-04) y un foro con un debate
 * (RF-MOOD-05), más un docente y dos estudiantes.
 *
 * Se puede correr las veces que haga falta: si el curso existe lo borra y lo
 * vuelve a crear, y a los usuarios que ya existen les restablece la contraseña.
 * Las fechas se calculan desde la hora de la corrida, así que siempre quedan
 * abiertas.
 *
 *   docker compose run --rm moodle php pruebas/seed/sembrar.php
 *
 * @package    core
 * @copyright  2026 Juan Sebastian Ospina Lora
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

define('CLI_SCRIPT', true);

require(__DIR__ . '/../../config.php');
require_once($CFG->libdir . '/clilib.php');
require_once($CFG->libdir . '/testing/generator/lib.php');
require_once($CFG->dirroot . '/mod/quiz/locallib.php');

// Los mismos valores los usan las suites de pruebas/: si cambian aquí, cambian allá.
const CURSO_CORTO = 'LAB-PRUEBAS';
const CURSO_NOMBRE = 'Laboratorio de pruebas de software';
const CLAVE_MATRICULA = 'Clave-2026';
const CONTRASENA = 'Pruebas-2026';
const USUARIOS = [
    // Matriculado como estudiante: entrega, presenta el cuestionario y participa en el foro.
    'estudiante.a' => ['firstname' => 'Ana', 'lastname' => 'Estudiante', 'rol' => 'student'],
    // Sin matricular: es quien se automatricula con la clave (RF-MOOD-01).
    'estudiante.b' => ['firstname' => 'Bruno', 'lastname' => 'Estudiante', 'rol' => null],
    // Califica las entregas y abre el debate del foro.
    'docente' => ['firstname' => 'Diana', 'lastname' => 'Docente', 'rol' => 'editingteacher'],
];

$admin = get_admin();
\core\session\manager::set_user($admin);
$generator = new testing_data_generator();
$ahora = time();
$dia = DAYSECS;

// 1. Curso: se recrea desde cero para que cada corrida parta del mismo estado.
// La papelera de reciclaje respaldaría el curso borrado en cada siembra; en
// este sitio de laboratorio no hace falta.
set_config('categorybinenable', 0, 'tool_recyclebin');
if ($curso = $DB->get_record('course', ['shortname' => CURSO_CORTO])) {
    mtrace('Borrando el curso anterior ' . CURSO_CORTO . '...');
    delete_course($curso, false, false);
}
$curso = $generator->create_course([
    'shortname' => CURSO_CORTO,
    'fullname' => CURSO_NOMBRE,
    'summary' => 'Curso sembrado para el proyecto de pruebas de software.',
    'numsections' => 1,
]);

// 2. Automatriculación con clave (RF-MOOD-01). Moodle crea la instancia por
// defecto desactivada; se activa y se le pone la clave.
$self = enrol_get_plugin('self');
$instancia = $DB->get_record('enrol', ['courseid' => $curso->id, 'enrol' => 'self']);
if (!$instancia) {
    $instancia = $DB->get_record('enrol', ['id' => $self->add_default_instance($curso)]);
}
$DB->update_record('enrol', (object) [
    'id' => $instancia->id,
    'status' => ENROL_INSTANCE_ENABLED,
    'password' => CLAVE_MATRICULA,
    'customint6' => 1, // Permite matrículas nuevas.
]);

// 3. Usuarios y matrículas.
$ids = [];
foreach (USUARIOS as $usuario => $datos) {
    if ($existente = $DB->get_record('user', ['username' => $usuario, 'deleted' => 0])) {
        update_internal_user_password($existente, CONTRASENA);
        $ids[$usuario] = $existente->id;
    } else {
        $ids[$usuario] = $generator->create_user([
            'username' => $usuario,
            'password' => CONTRASENA,
            'firstname' => $datos['firstname'],
            'lastname' => $datos['lastname'],
            'email' => $usuario . '@example.com',
        ])->id;
    }
    if ($datos['rol']) {
        $generator->enrol_user($ids[$usuario], $curso->id, $datos['rol']);
    }
}

// 4. Tarea (RF-MOOD-02 y 03): texto en línea y archivo, calificada sobre 100.
$tarea = $generator->create_module('assign', [
    'course' => $curso->id,
    'name' => 'Tarea de laboratorio',
    'intro' => 'Entregue un texto corto o un archivo.',
    'assignsubmission_onlinetext_enabled' => 1,
    'assignsubmission_file_enabled' => 1,
    'assignsubmission_file_maxfiles' => 2,
    'assignsubmission_file_maxsizebytes' => 1048576,
    'submissiondrafts' => 1, // El estudiante confirma con "Enviar para calificar".
    'allowsubmissionsfromdate' => $ahora - $dia,
    'duedate' => $ahora + 7 * $dia,
    'cutoffdate' => $ahora + 14 * $dia,
    'gradingduedate' => $ahora + 21 * $dia,
    'grade' => 100,
]);

// 5. Cuestionario (RF-MOOD-04): tres preguntas del banco del curso, dos intentos.
$cuestionario = $generator->create_module('quiz', [
    'course' => $curso->id,
    'name' => 'Cuestionario de laboratorio',
    'intro' => 'Tres preguntas de práctica.',
    'timeopen' => $ahora - $dia,
    'timeclose' => $ahora + 7 * $dia,
    'attempts' => 2,
    'grade' => 10,
]);
$preguntas = $generator->get_plugin_generator('core_question');
$categoria = $preguntas->create_question_category([
    'contextid' => context_course::instance($curso->id)->id,
    'name' => 'Preguntas del laboratorio',
]);
foreach (['truefalse', 'shortanswer', 'numerical'] as $tipo) {
    $pregunta = $preguntas->create_question($tipo, null, ['category' => $categoria->id]);
    quiz_add_quiz_question($pregunta->id, $cuestionario, 1);
}
\mod_quiz\quiz_settings::create($cuestionario->id)->get_grade_calculator()->recompute_quiz_sumgrades();

// 6. Foro (RF-MOOD-05): un foro general con un debate abierto por el docente.
$foro = $generator->create_module('forum', [
    'course' => $curso->id,
    'name' => 'Foro de laboratorio',
    'intro' => 'Espacio para discutir los temas del curso.',
    'type' => 'general',
]);
$debate = $generator->get_plugin_generator('mod_forum')->create_discussion([
    'course' => $curso->id,
    'forum' => $foro->id,
    'userid' => $ids['docente'],
    'name' => 'Debate inicial',
    'message' => '¿Qué esperan aprender en este curso?',
]);

// Resumen para la guía y para configurar las suites.
$url = fn(string $ruta, array $parametros) => (new moodle_url($ruta, $parametros))->out(false);
cli_writeln('');
cli_writeln('Siembra completa.');
cli_writeln('  Curso:         ' . $url('/course/view.php', ['id' => $curso->id]) . ' (' . CURSO_CORTO . ')');
cli_writeln('  Clave:         ' . CLAVE_MATRICULA);
cli_writeln('  Tarea:         ' . $url('/mod/assign/view.php', ['id' => $tarea->cmid]));
cli_writeln('  Cuestionario:  ' . $url('/mod/quiz/view.php', ['id' => $cuestionario->cmid]));
cli_writeln('  Foro:          ' . $url('/mod/forum/view.php', ['id' => $foro->cmid]));
cli_writeln('  Debate:        ' . $url('/mod/forum/discuss.php', ['d' => $debate->id]));
cli_writeln('  Usuarios:      ' . implode(', ', array_keys(USUARIOS)) . ' (contraseña ' . CONTRASENA . ')');
