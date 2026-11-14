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

namespace mod_assign;

defined('MOODLE_INTERNAL') || die();

global $CFG;
require_once($CFG->dirroot . '/mod/assign/locallib.php');

/**
 * La huella con la que el portafolio detecta si un texto en línea cambió (assign_portfolio_caller::get_sha1()).
 *
 * La API de portafolio guarda la huella al encolar una exportación y la compara al ejecutarla. SonarQube
 * marca el uso de SHA-1 como vulnerabilidad (MOOD-DEF-003); estas pruebas fijan que la huella del texto
 * sea SHA-256 y que siga cambiando solo cuando cambia el contenido. Se escribieron antes de la corrección
 * (ciclo TDD).
 *
 * @package    mod_assign
 * @category   test
 * @copyright  2026 Juan Sebastian Ospina Lora
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
#[\PHPUnit\Framework\Attributes\CoversMethod(\assign_portfolio_caller::class, 'get_sha1')]
final class portfolio_caller_huella_test extends \advanced_testcase {

    /** @var \stdClass El módulo de la tarea. */
    private \stdClass $cm;

    /** @var \stdClass La entrega de texto en línea del estudiante. */
    private \stdClass $entrega;

    #[\Override]
    protected function setUp(): void {
        parent::setUp();
        $this->resetAfterTest();
        $curso = $this->getDataGenerator()->create_course();
        $estudiante = $this->getDataGenerator()->create_and_enrol($curso, 'student');
        $tarea = $this->getDataGenerator()->create_module('assign', [
            'course' => $curso->id,
            'assignsubmission_onlinetext_enabled' => 1,
        ]);
        $this->cm = get_coursemodule_from_instance('assign', $tarea->id);
        $this->getDataGenerator()->get_plugin_generator('mod_assign')->create_submission([
            'userid' => $estudiante->id,
            'cmid' => $this->cm->id,
            'onlinetext' => '<p>Texto original</p>',
        ]);
        $this->entrega = (new \assign(\context_module::instance($this->cm->id), $this->cm, $curso))
            ->get_user_submission($estudiante->id, false);
        $this->setUser($estudiante);
    }

    /**
     * La huella que calcula el portafolio para el texto en línea de la entrega.
     *
     * @return string
     */
    private function huella(): string {
        global $USER;
        $llamador = new \assign_portfolio_caller([
            'cmid' => $this->cm->id,
            'sid' => $this->entrega->id,
            'plugin' => 'onlinetext',
            'editor' => 'onlinetext',
            'area' => ASSIGNSUBMISSION_ONLINETEXT_FILEAREA,
            'component' => 'assignsubmission_onlinetext',
        ]);
        $llamador->set('user', $USER);
        $llamador->load_data();
        return $llamador->get_sha1();
    }

    public function test_la_huella_del_texto_en_linea_es_sha256(): void {
        // Act.
        $huella = $this->huella();

        // Assert.
        $this->assertMatchesRegularExpression('/^[0-9a-f]{64}$/', $huella);
    }

    public function test_la_huella_no_cambia_si_el_texto_no_cambia(): void {
        // Act y Assert.
        $this->assertSame($this->huella(), $this->huella());
    }

    public function test_la_huella_cambia_si_se_edita_el_texto(): void {
        global $DB;
        // Arrange.
        $antes = $this->huella();

        // Act.
        $DB->set_field('assignsubmission_onlinetext', 'onlinetext', '<p>Texto editado</p>',
            ['submission' => $this->entrega->id]);

        // Assert.
        $this->assertNotSame($antes, $this->huella());
    }
}
