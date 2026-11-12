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

namespace assignsubmission_onlinetext\caja_blanca;

use assign_submission_onlinetext;
use stdClass;

defined('MOODLE_INTERNAL') || die();

global $CFG;
require_once($CFG->dirroot . '/mod/assign/locallib.php');
require_once($CFG->dirroot . '/mod/assign/submission/onlinetext/locallib.php');

/**
 * Caja blanca de RF-MOOD-02 (back): un test por camino de assign_submission_onlinetext::submission_is_empty().
 *
 * @package    assignsubmission_onlinetext
 * @category   test
 * @copyright  2026 Juan Sebastian Ospina Lora
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
#[\PHPUnit\Framework\Attributes\CoversMethod(assign_submission_onlinetext::class, 'submission_is_empty')]
final class submission_is_empty_test extends \advanced_testcase {

    /** @var assign_submission_onlinetext El plugin de texto en línea de una tarea real. */
    private assign_submission_onlinetext $plugin;

    #[\Override]
    protected function setUp(): void {
        parent::setUp();
        $this->resetAfterTest();
        $course = $this->getDataGenerator()->create_course();
        $tarea = $this->getDataGenerator()->create_module('assign', [
            'course' => $course->id,
            'assignsubmission_onlinetext_enabled' => 1,
        ]);
        $assign = new \assign(\context_module::instance($tarea->cmid), null, null);
        $this->plugin = $assign->get_submission_plugin_by_type('onlinetext');
    }

    /**
     * Los datos que envía el formulario, con el texto dado en el editor.
     *
     * @param string $texto
     * @return stdClass
     */
    private function datos_con_texto(string $texto): stdClass {
        return (object) ['onlinetext_editor' => ['text' => $texto, 'format' => FORMAT_HTML, 'itemid' => 0]];
    }

    public function test_camino_01_sin_editor(): void {
        // Arrange.
        $datos = new stdClass();

        // Act.
        $vacia = $this->plugin->submission_is_empty($datos);

        // Assert.
        $this->assertThat($vacia, $this->isTrue());
    }

    public function test_camino_02_texto_vacio(): void {
        // Arrange.
        $datos = $this->datos_con_texto('');

        // Act.
        $vacia = $this->plugin->submission_is_empty($datos);

        // Assert.
        $this->assertThat($vacia, $this->isTrue());
    }

    public function test_camino_03_solo_una_imagen(): void {
        // Arrange: la imagen no suma palabras, pero cuenta como recurso insertado.
        $datos = $this->datos_con_texto('<img src=x.png>');

        // Act.
        $vacia = $this->plugin->submission_is_empty($datos);

        // Assert.
        $this->assertThat($vacia, $this->isFalse());
    }

    public function test_camino_04_con_texto(): void {
        // Arrange.
        $datos = $this->datos_con_texto('Hola mundo');

        // Act.
        $vacia = $this->plugin->submission_is_empty($datos);

        // Assert.
        $this->assertThat($vacia, $this->isFalse());
    }

    public function test_camino_05_editor_sin_texto(): void {
        // Arrange.
        $datos = (object) ['onlinetext_editor' => ['format' => FORMAT_HTML, 'itemid' => 0]];

        // Act.
        $vacia = $this->plugin->submission_is_empty($datos);

        // Assert.
        $this->assertThat($vacia, $this->isTrue());
    }
}
