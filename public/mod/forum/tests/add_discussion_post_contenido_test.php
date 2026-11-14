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

namespace mod_forum;

use core_external\external_api;
use mod_forum_external;

defined('MOODLE_INTERNAL') || die();

global $CFG;
require_once($CFG->dirroot . '/mod/forum/externallib.php');

/**
 * El contenido de una respuesta enviada por el servicio web (mod_forum_add_discussion_post).
 *
 * El formulario de respuesta exige un mensaje y un asunto de hasta 255 caracteres, pero el servicio
 * web no lo comprobaba (hallazgos H-API-01 y H-API-02 de las pruebas de API): una respuesta vacía se
 * guardaba, y un asunto de 256 caracteres terminaba en un error de la base de datos. Estas pruebas se
 * escribieron antes de la corrección (ciclo TDD).
 *
 * @package    mod_forum
 * @category   test
 * @copyright  2026 Juan Sebastian Ospina Lora
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
#[\PHPUnit\Framework\Attributes\CoversMethod(mod_forum_external::class, 'add_discussion_post')]
final class add_discussion_post_contenido_test extends \advanced_testcase {

    /** @var \stdClass La discusión, abierta por la docente. */
    private \stdClass $discusion;

    #[\Override]
    protected function setUp(): void {
        parent::setUp();
        $this->resetAfterTest();
        $curso = $this->getDataGenerator()->create_course();
        $foro = $this->getDataGenerator()->create_module('forum', ['course' => $curso->id]);
        $docente = $this->getDataGenerator()->create_and_enrol($curso, 'editingteacher');
        $this->discusion = $this->getDataGenerator()->get_plugin_generator('mod_forum')->create_discussion([
            'course' => $curso->id,
            'forum' => $foro->id,
            'userid' => $docente->id,
        ]);
        $this->setUser($this->getDataGenerator()->create_and_enrol($curso, 'student'));
    }

    /**
     * Responde al primer mensaje de la discusión por el servicio web.
     *
     * @param string $asunto
     * @param string $mensaje
     * @return array La respuesta del servicio.
     */
    private function responder(string $asunto, string $mensaje): array {
        $respuesta = mod_forum_external::add_discussion_post($this->discusion->firstpost, $asunto, $mensaje);
        return external_api::clean_returnvalue(mod_forum_external::add_discussion_post_returns(), $respuesta);
    }

    /**
     * Cuántos mensajes tiene la discusión.
     *
     * @return int
     */
    private function mensajes(): int {
        global $DB;
        return $DB->count_records('forum_posts', ['discussion' => $this->discusion->id]);
    }

    public function test_rechaza_un_mensaje_vacio_y_no_lo_guarda(): void {
        // Arrange.
        $antes = $this->mensajes();

        // Act y Assert.
        try {
            $this->responder('Re: debate', '');
            $this->fail('Se aceptó una respuesta con el mensaje vacío.');
        } catch (\moodle_exception $error) {
            $this->assertSame('erroremptymessage', $error->errorcode);
        }
        $this->assertSame($antes, $this->mensajes());
    }

    public function test_rechaza_un_mensaje_que_solo_tiene_html_vacio(): void {
        // Arrange.
        $antes = $this->mensajes();

        // Act y Assert.
        try {
            $this->responder('Re: debate', '<p> </p>');
            $this->fail('Se aceptó una respuesta sin texto.');
        } catch (\moodle_exception $error) {
            $this->assertSame('erroremptymessage', $error->errorcode);
        }
        $this->assertSame($antes, $this->mensajes());
    }

    public function test_rechaza_un_asunto_vacio(): void {
        // Arrange.
        $antes = $this->mensajes();

        // Act y Assert.
        try {
            $this->responder('   ', 'Mensaje con contenido');
            $this->fail('Se aceptó una respuesta sin asunto.');
        } catch (\moodle_exception $error) {
            $this->assertSame('erroremptysubject', $error->errorcode);
        }
        $this->assertSame($antes, $this->mensajes());
    }

    public function test_rechaza_un_asunto_de_256_caracteres_sin_error_de_base_de_datos(): void {
        // Arrange.
        $antes = $this->mensajes();

        // Act y Assert: un error de validación, no un dml_write_exception.
        try {
            $this->responder(str_repeat('A', 256), 'Mensaje con contenido');
            $this->fail('Se aceptó un asunto de 256 caracteres.');
        } catch (\dml_exception $error) {
            $this->fail('El asunto largo llegó a la base de datos: ' . $error->getMessage());
        } catch (\invalid_parameter_exception $error) {
            $this->assertStringContainsString(get_string('maximumchars', '', 255), $error->getMessage());
        }
        $this->assertSame($antes, $this->mensajes());
    }

    public function test_acepta_un_asunto_de_255_caracteres_y_un_mensaje_con_contenido(): void {
        // Arrange.
        $antes = $this->mensajes();
        $asunto = str_repeat('Á', 255);

        // Act.
        $respuesta = $this->responder($asunto, '<p>Respuesta válida</p>');

        // Assert.
        $this->assertSame($antes + 1, $this->mensajes());
        $this->assertSame($asunto, $respuesta['post']['subject']);
    }
}
