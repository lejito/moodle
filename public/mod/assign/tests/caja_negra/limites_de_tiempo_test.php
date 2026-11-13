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

namespace mod_assign\caja_negra;

use assign;
use stdClass;

defined('MOODLE_INTERNAL') || die();

global $CFG;
require_once($CFG->dirroot . '/mod/assign/locallib.php');
require_once($CFG->dirroot . '/mod/assign/tests/generator.php');

/**
 * Caja negra de RF-MOOD-02: los límites al segundo de la apertura, el vencimiento y el corte.
 *
 * Casos MOOD-CP-217 a MOOD-CP-219 (docs del proyecto, caja negra de RF-MOOD-02). La tarea toma la
 * hora del reloj de Moodle, así que cada comprobación congela el reloj en el segundo exacto.
 *
 * @package    mod_assign
 * @category   test
 * @copyright  2026 Juan Sebastian Ospina Lora
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
#[\PHPUnit\Framework\Attributes\CoversMethod(assign::class, 'submissions_open')]
#[\PHPUnit\Framework\Attributes\CoversMethod(assign::class, 'get_assign_submission_status_renderable')]
final class limites_de_tiempo_test extends \advanced_testcase {
    use \mod_assign_test_generator;

    /** @var int Un instante fijo de referencia para las fechas de la tarea. */
    private const T = 1900000000;

    /** @var stdClass Curso de la prueba. */
    private stdClass $curso;

    /** @var stdClass Estudiante que entrega. */
    private stdClass $estudiante;

    #[\Override]
    protected function setUp(): void {
        parent::setUp();
        $this->resetAfterTest();
        $this->curso = $this->getDataGenerator()->create_course();
        $this->estudiante = $this->getDataGenerator()->create_and_enrol($this->curso, 'student');
    }

    /**
     * Una tarea de texto en línea con las fechas dadas.
     *
     * @param array $fechas allowsubmissionsfromdate, duedate y cutoffdate
     * @return assign
     */
    private function tarea(array $fechas): assign {
        return $this->create_instance($this->curso, $fechas + [
            'assignsubmission_onlinetext_enabled' => 1,
            'submissiondrafts' => 1,
        ]);
    }

    /**
     * Si la tarea acepta entregas del estudiante con el reloj congelado en $hora.
     *
     * @param assign $tarea
     * @param int $hora
     * @return bool
     */
    private function abierta_a_las(assign $tarea, int $hora): bool {
        $this->mock_clock_with_frozen($hora);
        return $tarea->submissions_open($this->estudiante->id);
    }

    /**
     * El estado de la entrega que ve el estudiante, si la envía con el reloj congelado en $hora.
     *
     * @param int $hora
     * @return string el HTML del estado de la entrega
     */
    private function estado_si_entrega_a_las(int $hora): string {
        global $PAGE;
        $tarea = $this->tarea(['duedate' => self::T, 'cutoffdate' => self::T + DAYSECS]);
        $this->mock_clock_with_frozen($hora);
        $this->add_submission($this->estudiante, $tarea);
        $this->submit_for_grading($this->estudiante, $tarea);
        $PAGE->set_url('/mod/assign/view.php', ['id' => $tarea->get_course_module()->id]);
        $estado = $tarea->get_assign_submission_status_renderable($this->estudiante, false);
        return $PAGE->get_renderer('mod_assign')->render($estado);
    }

    public function test_mood_cp_217_apertura(): void {
        // Arrange: abre en T.
        $tarea = $this->tarea(['allowsubmissionsfromdate' => self::T, 'duedate' => self::T + DAYSECS]);

        // Act.
        $antes = $this->abierta_a_las($tarea, self::T - 1);
        $justo = $this->abierta_a_las($tarea, self::T);

        // Assert: cerrada un segundo antes; abierta en la apertura.
        $this->assertFalse($antes);
        $this->assertTrue($justo);
    }

    public function test_mood_cp_218_vencimiento_justo_a_tiempo(): void {
        // Arrange y Act: vence en T y se envía en T.
        $html = $this->estado_si_entrega_a_las(self::T);

        // Assert: a tiempo, no tardía.
        $this->assertStringContainsString(get_string('submittedearly', 'assign', format_time(0)), $html);
        $this->assertStringNotContainsString(get_string('submittedlate', 'assign', ''), $html);
    }

    public function test_mood_cp_218_vencimiento_un_segundo_tarde(): void {
        // Arrange y Act: vence en T y se envía en T + 1.
        $html = $this->estado_si_entrega_a_las(self::T + 1);

        // Assert: tardía por un segundo.
        $this->assertStringContainsString(get_string('submittedlate', 'assign', format_time(1)), $html);
    }

    public function test_mood_cp_219_corte(): void {
        // Arrange: venció en T - 1 día y corta en T.
        $tarea = $this->tarea(['duedate' => self::T - DAYSECS, 'cutoffdate' => self::T]);

        // Act.
        $justo = $this->abierta_a_las($tarea, self::T);
        $despues = $this->abierta_a_las($tarea, self::T + 1);

        // Assert: todavía acepta en el corte; un segundo después, ya no.
        $this->assertTrue($justo);
        $this->assertFalse($despues);
    }
}
