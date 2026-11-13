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

namespace mod_quiz\caja_negra;

use mod_quiz\access_manager;
use mod_quiz\quiz_settings;

/**
 * Caja negra de RF-MOOD-04: los límites al segundo de la apertura y el cierre del cuestionario.
 *
 * Casos MOOD-CP-415 y MOOD-CP-416 (docs del proyecto, caja negra de RF-MOOD-04). Las reglas de
 * acceso reciben la hora como dato, así que se le pregunta al gestor de acceso de un cuestionario
 * real, tal como lo hace la página del cuestionario, en el segundo exacto de cada límite.
 *
 * @package    mod_quiz
 * @category   test
 * @copyright  2026 Juan Sebastian Ospina Lora
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
#[\PHPUnit\Framework\Attributes\CoversMethod(access_manager::class, 'prevent_access')]
final class limites_de_tiempo_test extends \advanced_testcase {

    /** @var int Apertura del cuestionario. */
    private const APERTURA = 1900000000;

    /** @var int Cierre del cuestionario. */
    private const CIERRE = self::APERTURA + WEEKSECS;

    /** @var int El cuestionario. */
    private int $quizid;

    /** @var int Un estudiante matriculado. */
    private int $estudianteid;

    #[\Override]
    protected function setUp(): void {
        parent::setUp();
        $this->resetAfterTest();
        $curso = $this->getDataGenerator()->create_course();
        $estudiante = $this->getDataGenerator()->create_and_enrol($curso, 'student');
        $quiz = $this->getDataGenerator()->create_module('quiz', [
            'course' => $curso->id,
            'timeopen' => self::APERTURA,
            'timeclose' => self::CIERRE,
        ]);
        $this->setUser($estudiante);
        $this->quizid = $quiz->id;
        $this->estudianteid = $estudiante->id;
    }

    /**
     * Los motivos por los que el estudiante no puede entrar, a la hora dada (vacío si puede).
     *
     * quiz_settings guarda el gestor de acceso con la primera hora que recibe, así que cada
     * consulta usa uno nuevo.
     *
     * @param int $hora
     * @return array
     */
    private function impedimentos_a_las(int $hora): array {
        return quiz_settings::create($this->quizid, $this->estudianteid)->get_access_manager($hora)->prevent_access();
    }

    public function test_mood_cp_415_apertura(): void {
        // Act.
        $antes = $this->impedimentos_a_las(self::APERTURA - 1);
        $justo = $this->impedimentos_a_las(self::APERTURA);

        // Assert: un segundo antes no está disponible; en la apertura, sí.
        $this->assertContains(get_string('notavailable', 'quizaccess_openclosedate'), $antes);
        $this->assertEmpty($justo);
    }

    public function test_mood_cp_416_cierre(): void {
        // Act.
        $justo = $this->impedimentos_a_las(self::CIERRE);
        $despues = $this->impedimentos_a_las(self::CIERRE + 1);

        // Assert: en el cierre todavía está disponible; un segundo después, no.
        $this->assertEmpty($justo);
        $this->assertContains(get_string('notavailable', 'quizaccess_openclosedate'), $despues);
    }
}
