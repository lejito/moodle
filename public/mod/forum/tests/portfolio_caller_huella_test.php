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

defined('MOODLE_INTERNAL') || die();

global $CFG;
require_once($CFG->dirroot . '/mod/forum/locallib.php');

/**
 * La huella con la que el portafolio detecta si un mensaje cambió (forum_portfolio_caller::get_sha1()).
 *
 * La API de portafolio guarda la huella al encolar una exportación y la compara al ejecutarla. SonarQube
 * marca el uso de SHA-1 como vulnerabilidad (MOOD-DEF-003); estas pruebas fijan que la huella sea SHA-256
 * y que siga cambiando solo cuando cambia el contenido. Se escribieron antes de la corrección (ciclo TDD).
 *
 * @package    mod_forum
 * @category   test
 * @copyright  2026 Juan Sebastian Ospina Lora
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
#[\PHPUnit\Framework\Attributes\CoversMethod(\forum_portfolio_caller::class, 'get_sha1')]
final class portfolio_caller_huella_test extends \advanced_testcase {

    /** @var \stdClass La discusión, con su primer mensaje. */
    private \stdClass $discusion;

    /** @var \stdClass La respuesta al primer mensaje. */
    private \stdClass $respuesta;

    #[\Override]
    protected function setUp(): void {
        parent::setUp();
        $this->resetAfterTest();
        $curso = $this->getDataGenerator()->create_course();
        $foro = $this->getDataGenerator()->create_module('forum', ['course' => $curso->id]);
        $usuario = $this->getDataGenerator()->create_and_enrol($curso, 'student');
        $generador = $this->getDataGenerator()->get_plugin_generator('mod_forum');
        $this->discusion = $generador->create_discussion([
            'course' => $curso->id,
            'forum' => $foro->id,
            'userid' => $usuario->id,
        ]);
        $this->respuesta = $generador->create_post([
            'discussion' => $this->discusion->id,
            'parent' => $this->discusion->firstpost,
            'userid' => $usuario->id,
            'message' => 'Respuesta original',
        ]);
        $this->setUser($usuario);
    }

    /**
     * La huella que calcula el portafolio para un mensaje o para toda la discusión.
     *
     * @param array $argumentos postid o discussionid.
     * @return string
     */
    private function huella(array $argumentos): string {
        $llamador = new \forum_portfolio_caller($argumentos);
        // El botón de exportar fija los formatos antes de cargar los datos.
        $llamador->set_formats_from_button(\forum_portfolio_caller::base_supported_formats());
        $llamador->load_data();
        return $llamador->get_sha1();
    }

    /**
     * Cambia el texto de la respuesta en la base de datos.
     *
     * @param string $texto
     */
    private function editar_respuesta(string $texto): void {
        global $DB;
        $DB->set_field('forum_posts', 'message', $texto, ['id' => $this->respuesta->id]);
    }

    public function test_la_huella_de_un_mensaje_es_sha256(): void {
        // Act.
        $huella = $this->huella(['postid' => $this->respuesta->id]);

        // Assert.
        $this->assertMatchesRegularExpression('/^[0-9a-f]{64}$/', $huella);
    }

    public function test_la_huella_de_una_discusion_es_sha256(): void {
        // Act.
        $huella = $this->huella(['discussionid' => $this->discusion->id]);

        // Assert.
        $this->assertMatchesRegularExpression('/^[0-9a-f]{64}$/', $huella);
    }

    public function test_la_huella_no_cambia_si_el_mensaje_no_cambia(): void {
        // Act y Assert.
        $this->assertSame(
            $this->huella(['postid' => $this->respuesta->id]),
            $this->huella(['postid' => $this->respuesta->id]),
        );
    }

    public function test_la_huella_cambia_si_se_edita_el_mensaje(): void {
        // Arrange.
        $antes = $this->huella(['postid' => $this->respuesta->id]);
        $discusionantes = $this->huella(['discussionid' => $this->discusion->id]);

        // Act.
        $this->editar_respuesta('Respuesta editada');

        // Assert.
        $this->assertNotSame($antes, $this->huella(['postid' => $this->respuesta->id]));
        $this->assertNotSame($discusionantes, $this->huella(['discussionid' => $this->discusion->id]));
    }
}
