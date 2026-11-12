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

namespace mod_assign\caja_blanca;

use assign;
use mod_assign_external;
use stdClass;

defined('MOODLE_INTERNAL') || die();

global $CFG;
require_once($CFG->dirroot . '/mod/assign/locallib.php');
require_once($CFG->dirroot . '/mod/assign/externallib.php');

/**
 * Caja blanca de RF-MOOD-03 (conexión): un test por camino de mod_assign_external::submit_grading_form().
 *
 * jsonformdata se arma como lo hace grading_panel.js: el formulario serializado como cadena de
 * consulta y codificado en JSON.
 *
 * Los caminos 1, 2, 5 y 6 necesitan WS_SERVER en true, que solo ocurre cuando la llamada entra por
 * webservice/rest/server.php. En PHPUnit la constante ya vale false y no se puede redefinir, así
 * que esos caminos se omiten aquí y se cubren en la suite de API (pruebas/cypress/api).
 *
 * @package    mod_assign
 * @category   test
 * @copyright  2026 Juan Sebastian Ospina Lora
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
#[\PHPUnit\Framework\Attributes\CoversMethod(mod_assign_external::class, 'submit_grading_form')]
final class submit_grading_form_test extends \advanced_testcase {

    /** @var string Motivo de los caminos que requieren WS_SERVER en true. */
    private const SOLO_REST = 'WS_SERVER solo es true en webservice/rest/server.php; se cubre en pruebas/cypress/api.';

    /** @var assign Tarea calificada sobre 100. */
    private assign $assign;

    /** @var stdClass Estudiante que se califica. */
    private stdClass $student;

    #[\Override]
    protected function setUp(): void {
        parent::setUp();
        $this->resetAfterTest();
        $course = $this->getDataGenerator()->create_course();
        $this->student = $this->getDataGenerator()->create_and_enrol($course, 'student');
        $this->setUser($this->getDataGenerator()->create_and_enrol($course, 'editingteacher'));
        $tarea = $this->getDataGenerator()->create_module('assign', ['course' => $course->id, 'grade' => 100]);
        $this->assign = new assign(\context_module::instance($tarea->cmid), null, null);
    }

    /**
     * El formulario del panel de calificación serializado, como lo envía el navegador.
     *
     * @param string $nota
     * @return string
     */
    private function formulario(string $nota): string {
        $_POST['sesskey'] = sesskey();
        $campos = [
            'id' => $this->assign->get_course_module()->id,
            'rownum' => 0,
            'useridlistid' => '',
            'attemptnumber' => -1,
            'ajax' => 0,
            'userid' => $this->student->id,
            'sendstudentnotifications' => 0,
            'action' => 'submitgrade',
            'grade' => $nota,
            'sesskey' => sesskey(),
            '_qf__mod_assign_grade_form_' . $this->student->id => 1,
        ];
        return json_encode(http_build_query($campos));
    }

    /**
     * La nota guardada del estudiante, o null si no tiene.
     *
     * Al construir el formulario, Moodle crea el registro de la nota con -1, que significa "sin calificar".
     *
     * @return float|null
     */
    private function nota(): ?float {
        $grade = $this->assign->get_user_grade($this->student->id, false);
        return ($grade && $grade->grade !== null && (float) $grade->grade >= 0) ? (float) $grade->grade : null;
    }

    public function test_camino_01_omitido_rest_formulario_valido(): void {
        $this->markTestSkipped(self::SOLO_REST);
    }

    public function test_camino_02_omitido_rest_formulario_invalido(): void {
        $this->markTestSkipped(self::SOLO_REST);
    }

    public function test_camino_03_omitido_navegador_formulario_valido(): void {
        // Arrange.
        $json = $this->formulario('50');

        // Act.
        $warnings = mod_assign_external::submit_grading_form($this->assign->get_instance()->id, $this->student->id, $json);

        // Assert.
        $this->assertThat($warnings, $this->isEmpty());
        $this->assertThat($this->nota(), $this->identicalTo(50.0));
    }

    public function test_camino_04_omitido_navegador_formulario_invalido(): void {
        // Arrange: la nota supera el máximo de 100.
        $json = $this->formulario('150');

        // Act.
        $warnings = mod_assign_external::submit_grading_form($this->assign->get_instance()->id, $this->student->id, $json);

        // Assert.
        $this->assertThat(array_column($warnings, 'warningcode'), $this->identicalTo(['couldnotsavegrade']));
        $this->assertThat($this->nota(), $this->isNull());
    }

    public function test_camino_05_recibido_rest_formulario_valido(): void {
        $this->markTestSkipped(self::SOLO_REST);
    }

    public function test_camino_06_recibido_rest_formulario_invalido(): void {
        $this->markTestSkipped(self::SOLO_REST);
    }

    public function test_camino_07_recibido_navegador_formulario_valido(): void {
        // Arrange.
        $json = $this->formulario('50');

        // Act.
        $warnings = mod_assign_external::submit_grading_form($this->assign->get_instance()->id, $this->student->id, $json,
            false);

        // Assert.
        $this->assertThat($warnings, $this->isEmpty());
        $this->assertThat($this->nota(), $this->identicalTo(50.0));
    }

    public function test_camino_08_recibido_navegador_formulario_invalido(): void {
        // Arrange.
        $json = $this->formulario('150');

        // Act.
        $warnings = mod_assign_external::submit_grading_form($this->assign->get_instance()->id, $this->student->id, $json,
            false);

        // Assert.
        $this->assertThat(array_column($warnings, 'warningcode'), $this->identicalTo(['couldnotsavegrade']));
        $this->assertThat($this->nota(), $this->isNull());
    }
}
