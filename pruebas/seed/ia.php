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
 * Activa el resumen con IA de Moodle para la evaluación con DeepEval.
 *
 * Crea (o recrea) una instancia del proveedor Gemini con la clave de la variable de entorno
 * GOOGLE_GENERATIVE_AI_API_KEY, deja la acción de resumir con el modelo Flash-Lite (el que más
 * consultas gratuitas da) y activa la ubicación "Course assist". Termina imprimiendo, en la última
 * línea, un JSON con el contexto del curso y el token de estudiante.a para el servicio web.
 *
 * El resumen con IA no es una de las cinco funcionalidades: es el componente de IA que evalúa
 * DeepEval (pruebas/deepeval). Gasta cupo de Gemini, así que solo se activa para esa evaluación.
 *
 *   docker compose exec -T -e GOOGLE_GENERATIVE_AI_API_KEY web php pruebas/seed/ia.php
 *
 * Requiere el sitio sembrado (sembrar.php) y la API REST (servicios_web.php).
 *
 * @package    core
 * @copyright  2026 Juan Sebastian Ospina Lora
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

define('CLI_SCRIPT', true);

require(__DIR__ . '/../../config.php');
require_once($CFG->libdir . '/clilib.php');
require_once(__DIR__ . '/datos.php');

/** Nombre de la instancia del proveedor que crea este script. */
const INSTANCIA = 'Gemini de pruebas';
/** Modelo de la acción de resumir. */
const MODELO = 'gemini-3.5-flash-lite';

$clave = trim((string) getenv('GOOGLE_GENERATIVE_AI_API_KEY'));
if ($clave === '') {
    cli_error('Falta GOOGLE_GENERATIVE_AI_API_KEY: la clave de Gemini (pruebas/.env).');
}

\core\session\manager::set_user(get_admin());
$manager = \core\di::get(\core_ai\manager::class);

// 1. Una sola instancia del proveedor, nueva en cada corrida (así toma la clave actual).
foreach ($manager->get_provider_instances(['name' => INSTANCIA]) as $anterior) {
    $manager->delete_provider_instance($anterior);
}
$proveedor = $manager->create_provider_instance(
    classname: \aiprovider_gemini\provider::class,
    name: INSTANCIA,
    enabled: true,
    config: ['apikey' => $clave],
);

// 2. La acción de resumir con Flash-Lite; las demás quedan con lo que trae Moodle.
$acciones = $proveedor->actionconfig;
$resumir = \core_ai\aiactions\summarise_text::class;
$acciones[$resumir]['enabled'] = true;
$acciones[$resumir]['settings']['model'] = MODELO;
$acciones[$resumir]['settings']['endpoint'] =
    'https://generativelanguage.googleapis.com/v1beta/models/' . MODELO . ':generateContent';
$proveedor = $manager->update_provider_instance(provider: $proveedor, actionconfig: $acciones);

// 3. La ubicación "Course assist" y su acción de resumir.
\core\plugininfo\aiplacement::enable_plugin('courseassist', 1);
$manager->set_action_state('aiplacement_courseassist', 'summarise_text', 1);

// 4. Lo que necesita DeepEval.
$curso = $DB->get_record('course', ['shortname' => CURSO_CORTO], '*', MUST_EXIST);
$estudiante = $DB->get_record('user', ['username' => 'estudiante.a', 'deleted' => 0], '*', MUST_EXIST);
$servicio = $DB->get_field('external_services', 'id', ['shortname' => 'pruebas'], MUST_EXIST);
$token = $DB->get_field('external_tokens', 'token',
    ['userid' => $estudiante->id, 'externalserviceid' => $servicio], IGNORE_MULTIPLE);
if (!$token) {
    cli_error('No hay token de estudiante.a: corra antes pruebas/seed/servicios_web.php.');
}

cli_writeln('Resumen con IA activo: proveedor ' . INSTANCIA . ', modelo ' . MODELO . '.');
cli_writeln(json_encode([
    'contexto' => (int) context_course::instance($curso->id)->id,
    'token' => $token,
    'modelo' => MODELO,
]));
