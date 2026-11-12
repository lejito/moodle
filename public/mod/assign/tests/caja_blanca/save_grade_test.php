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
use stdClass;

defined('MOODLE_INTERNAL') || die();

global $CFG;
require_once($CFG->dirroot . '/mod/assign/locallib.php');

/**
 * Caja blanca de RF-MOOD-03 (back): un test por camino de assign::save_grade().
 *
 * Los caminos de tareas en grupo crean antes la entrega del grupo, como ocurre al abrir el
 * calificador. Un grupo sin miembros se fuerza con un estudiante con la matrícula suspendida, que
 * get_submission_group_members() excluye.
 *
 * @package    mod_assign
 * @category   test
 * @copyright  2026 Juan Sebastian Ospina Lora
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
#[\PHPUnit\Framework\Attributes\CoversMethod(assign::class, 'save_grade')]
final class save_grade_test extends \advanced_testcase {

    /** @var float Nota que se aplica en todos los caminos. */
    private const NOTA = 50.0;

    /** @var stdClass Curso de la prueba. */
    private stdClass $course;

    #[\Override]
    protected function setUp(): void {
        parent::setUp();
        $this->resetAfterTest();
        $this->course = $this->getDataGenerator()->create_course();
        $this->setUser($this->getDataGenerator()->create_and_enrol($this->course, 'editingteacher'));
    }

    /**
     * Una tarea calificada sobre 100, individual o en grupo.
     *
     * @param int $engrupo Valor de teamsubmission.
     * @return assign
     */
    private function tarea(int $engrupo): assign {
        $tarea = $this->getDataGenerator()->create_module('assign', [
            'course' => $this->course->id,
            'grade' => 100,
            'teamsubmission' => $engrupo,
            'preventsubmissionnotingroup' => 0,
        ]);
        return new assign(\context_module::instance($tarea->cmid), null, null);
    }

    /**
     * Un estudiante del curso, activo o con la matrícula suspendida.
     *
     * @param bool $suspendido
     * @return stdClass
     */
    private function estudiante(bool $suspendido = false): stdClass {
        $user = $this->getDataGenerator()->create_user();
        $this->getDataGenerator()->enrol_user($user->id, $this->course->id, 'student', 'manual', 0, 0,
            $suspendido ? ENROL_USER_SUSPENDED : ENROL_USER_ACTIVE);
        return $user;
    }

    /**
     * Pone al estudiante en un grupo nuevo del curso.
     *
     * @param stdClass $user
     */
    private function en_un_grupo(stdClass $user): void {
        $group = $this->getDataGenerator()->create_group(['courseid' => $this->course->id]);
        $this->getDataGenerator()->create_group_member(['groupid' => $group->id, 'userid' => $user->id]);
    }

    /**
     * Los datos del formulario de calificación.
     *
     * @param int $atodos Valor de applytoall.
     * @return stdClass
     */
    private function datos(int $atodos): stdClass {
        return (object) ['grade' => self::NOTA, 'attemptnumber' => -1, 'applytoall' => $atodos];
    }

    /**
     * La nota guardada del estudiante, o null si no tiene.
     *
     * @param assign $assign
     * @param stdClass $user
     * @return float|null
     */
    private function nota(assign $assign, stdClass $user): ?float {
        $grade = $assign->get_user_grade($user->id, false);
        return ($grade && $grade->grade !== null) ? (float) $grade->grade : null;
    }

    public function test_camino_01_grupo_a_todos_con_un_miembro(): void {
        // Arrange.
        $assign = $this->tarea(1);
        $student = $this->estudiante();
        $this->en_un_grupo($student);
        $assign->get_group_submission($student->id, 0, true);

        // Act.
        $resultado = $assign->save_grade($student->id, $this->datos(1));

        // Assert.
        $this->assertThat($resultado, $this->isTrue());
        $this->assertThat($this->nota($assign, $student), $this->identicalTo(self::NOTA));
    }

    public function test_camino_02_grupo_a_todos_sin_miembros_activos(): void {
        // Arrange.
        $assign = $this->tarea(1);
        $student = $this->estudiante(true);
        $this->en_un_grupo($student);
        $assign->get_group_submission($student->id, 0, true);

        // Act.
        $resultado = $assign->save_grade($student->id, $this->datos(1));

        // Assert: el ciclo no se recorre y nadie recibe la nota.
        $this->assertThat($resultado, $this->isTrue());
        $this->assertThat($this->nota($assign, $student), $this->isNull());
    }

    public function test_camino_03_sin_grupo_a_todos_con_un_miembro(): void {
        // Arrange: sin grupo, los miembros son los estudiantes que no están en ninguno.
        $assign = $this->tarea(1);
        $student = $this->estudiante();
        $assign->get_group_submission($student->id, 0, true);

        // Act.
        $resultado = $assign->save_grade($student->id, $this->datos(1));

        // Assert.
        $this->assertThat($resultado, $this->isTrue());
        $this->assertThat($this->nota($assign, $student), $this->identicalTo(self::NOTA));
    }

    public function test_camino_04_sin_grupo_a_todos_sin_miembros_activos(): void {
        // Arrange.
        $assign = $this->tarea(1);
        $student = $this->estudiante(true);
        $assign->get_group_submission($student->id, 0, true);

        // Act.
        $resultado = $assign->save_grade($student->id, $this->datos(1));

        // Assert.
        $this->assertThat($resultado, $this->isTrue());
        $this->assertThat($this->nota($assign, $student), $this->isNull());
    }

    public function test_camino_05_grupo_solo_al_estudiante(): void {
        // Arrange.
        $assign = $this->tarea(1);
        $student = $this->estudiante();
        $companero = $this->estudiante();
        $this->en_un_grupo($student);
        $assign->get_group_submission($student->id, 0, true);

        // Act.
        $resultado = $assign->save_grade($student->id, $this->datos(0));

        // Assert: solo el estudiante calificado recibe la nota.
        $this->assertThat($resultado, $this->isTrue());
        $this->assertThat($this->nota($assign, $student), $this->identicalTo(self::NOTA));
        $this->assertThat($this->nota($assign, $companero), $this->isNull());
    }

    public function test_camino_06_tarea_individual(): void {
        // Arrange.
        $assign = $this->tarea(0);
        $student = $this->estudiante();

        // Act.
        $resultado = $assign->save_grade($student->id, $this->datos(0));

        // Assert.
        $this->assertThat($resultado, $this->isTrue());
        $this->assertThat($this->nota($assign, $student), $this->identicalTo(self::NOTA));
    }
}
