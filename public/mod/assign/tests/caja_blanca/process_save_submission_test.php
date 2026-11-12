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
use mod_assign_submission_form;
use stdClass;

defined('MOODLE_INTERNAL') || die();

global $CFG;
require_once($CFG->dirroot . '/mod/assign/locallib.php');
require_once($CFG->dirroot . '/mod/assign/submission_form.php');

/**
 * Caja blanca de RF-MOOD-02 (conexión): un test por camino de assign::process_save_submission().
 *
 * El envío del formulario de entrega se simula con mock_submit(), que llena $_POST como lo haría el
 * navegador, incluida la sesskey.
 *
 * @package    mod_assign
 * @category   test
 * @copyright  2026 Juan Sebastian Ospina Lora
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
#[\PHPUnit\Framework\Attributes\CoversMethod(assign::class, 'process_save_submission')]
final class process_save_submission_test extends \advanced_testcase {

    /** @var stdClass Curso de la prueba. */
    private stdClass $course;

    /** @var stdClass Estudiante que entrega. */
    private stdClass $student;

    #[\Override]
    protected function setUp(): void {
        parent::setUp();
        $this->resetAfterTest();
        $this->course = $this->getDataGenerator()->create_course();
        $this->student = $this->getDataGenerator()->create_and_enrol($this->course, 'student');
        $this->setUser($this->student);
    }

    /**
     * Una tarea de texto en línea, con las fechas dadas.
     *
     * @param array $fechas Campos de fecha de la tarea.
     * @return assign
     */
    private function tarea(array $fechas = []): assign {
        $tarea = $this->getDataGenerator()->create_module('assign', [
            'course' => $this->course->id,
            'assignsubmission_onlinetext_enabled' => 1,
            'submissiondrafts' => 0,
        ] + $fechas);
        return new assign(\context_module::instance($tarea->cmid), null, null);
    }

    /**
     * Llama al método protegido, con sus dos parámetros por referencia.
     *
     * @param assign $assign
     * @param array $notices Avisos que el método agrega.
     * @return bool
     */
    private function procesar(assign $assign, array &$notices): bool {
        $mform = null;
        $metodo = new \ReflectionMethod(assign::class, 'process_save_submission');
        return $metodo->invokeArgs($assign, [&$mform, &$notices]);
    }

    /**
     * Simula el envío del formulario de entrega con los campos dados.
     *
     * @param assign $assign
     * @param array $campos
     */
    private function enviar(assign $assign, array $campos): void {
        mod_assign_submission_form::mock_submit($campos + [
            'id' => $assign->get_course_module()->id,
            'action' => 'savesubmission',
            'userid' => $this->student->id,
        ]);
    }

    public function test_camino_01_plazo_vencido(): void {
        // Arrange: venció la fecha de corte.
        $assign = $this->tarea(['duedate' => time() - 2 * DAYSECS, 'cutoffdate' => time() - DAYSECS]);
        $_POST['sesskey'] = sesskey();
        $notices = [];

        // Act.
        $resultado = $this->procesar($assign, $notices);

        // Assert.
        $this->assertThat($resultado, $this->isFalse());
        $this->assertThat($notices, $this->identicalTo([get_string('duedatereached', 'assign')]));
    }

    public function test_camino_02_formulario_cancelado(): void {
        global $DB;

        // Arrange.
        $assign = $this->tarea();
        $this->enviar($assign, ['cancel' => get_string('cancel')]);
        $notices = [];

        // Act.
        $resultado = $this->procesar($assign, $notices);

        // Assert: el formulario deja la entrega creada en estado nuevo, pero sin texto guardado.
        $submission = $assign->get_user_submission($this->student->id, false);
        $this->assertThat($resultado, $this->isTrue());
        $this->assertThat($submission->status, $this->identicalTo(ASSIGN_SUBMISSION_STATUS_NEW));
        $this->assertThat($DB->record_exists('assignsubmission_onlinetext', ['submission' => $submission->id]),
            $this->isFalse());
    }

    public function test_camino_03_datos_validos_se_guardan(): void {
        global $DB;

        // Arrange.
        $assign = $this->tarea();
        $this->enviar($assign, ['onlinetext_editor' => [
            'text' => 'Hola mundo',
            'format' => FORMAT_HTML,
            'itemid' => file_get_unused_draft_itemid(),
        ]]);
        $notices = [];

        // Act.
        $resultado = $this->procesar($assign, $notices);

        // Assert.
        $submission = $assign->get_user_submission($this->student->id, false);
        $this->assertThat($resultado, $this->isTrue());
        $this->assertThat($DB->get_field('assignsubmission_onlinetext', 'onlinetext', ['submission' => $submission->id]),
            $this->identicalTo('Hola mundo'));
    }

    public function test_camino_04_sin_datos_del_formulario(): void {
        // Arrange: la petición trae la sesskey, pero el formulario no fue enviado.
        $assign = $this->tarea();
        $_POST['sesskey'] = sesskey();
        $notices = [];

        // Act.
        $resultado = $this->procesar($assign, $notices);

        // Assert.
        $this->assertThat($resultado, $this->isFalse());
        $this->assertThat($notices, $this->isEmpty());
    }
}
