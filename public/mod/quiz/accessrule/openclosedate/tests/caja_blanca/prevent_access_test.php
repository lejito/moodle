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

namespace quizaccess_openclosedate\caja_blanca;

use mod_quiz\quiz_settings;
use quizaccess_openclosedate;
use stdClass;

defined('MOODLE_INTERNAL') || die();

global $CFG;
require_once($CFG->dirroot . '/mod/quiz/accessrule/openclosedate/rule.php');

/**
 * Caja blanca de RF-MOOD-04 (back): un test por camino de quizaccess_openclosedate::prevent_access().
 *
 * La regla recibe la hora al crearse, así que cada camino fija la hora exacta del límite que prueba:
 * apertura en 1000, cierre en 2000 y 300 segundos de gracia.
 *
 * @package    quizaccess_openclosedate
 * @category   test
 * @copyright  2026 Juan Sebastian Ospina Lora
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
#[\PHPUnit\Framework\Attributes\CoversMethod(quizaccess_openclosedate::class, 'prevent_access')]
final class prevent_access_test extends \basic_testcase {

    /**
     * La regla de un cuestionario con las fechas dadas, evaluada a la hora dada.
     *
     * @param int $timenow
     * @param int $timeclose
     * @param string $overduehandling
     * @return quizaccess_openclosedate
     */
    private function regla(int $timenow, int $timeclose = 2000, string $overduehandling = 'graceperiod'): quizaccess_openclosedate {
        $quiz = new stdClass();
        $quiz->timeopen = 1000;
        $quiz->timeclose = $timeclose;
        $quiz->overduehandling = $overduehandling;
        $quiz->graceperiod = 300;
        $cm = new stdClass();
        $cm->id = 0;
        return new quizaccess_openclosedate(new quiz_settings($quiz, $cm, null), $timenow);
    }

    /**
     * El mensaje que impide el acceso.
     *
     * @return string
     */
    private function no_disponible(): string {
        return get_string('notavailable', 'quizaccess_openclosedate');
    }

    public function test_camino_01_antes_de_abrir(): void {
        // Arrange: un segundo antes de la apertura.
        $regla = $this->regla(999);

        // Act.
        $resultado = $regla->prevent_access();

        // Assert.
        $this->assertThat($resultado, $this->identicalTo($this->no_disponible()));
    }

    public function test_camino_02_abierto_sin_fecha_de_cierre(): void {
        // Arrange: en el segundo exacto de la apertura ya está abierto.
        $regla = $this->regla(1000, 0);

        // Act.
        $resultado = $regla->prevent_access();

        // Assert.
        $this->assertThat($resultado, $this->isFalse());
    }

    public function test_camino_03_en_el_segundo_del_cierre(): void {
        // Arrange.
        $regla = $this->regla(2000);

        // Act.
        $resultado = $regla->prevent_access();

        // Assert.
        $this->assertThat($resultado, $this->isFalse());
    }

    public function test_camino_04_cerrado_sin_periodo_de_gracia(): void {
        // Arrange.
        $regla = $this->regla(2001, 2000, 'autosubmit');

        // Act.
        $resultado = $regla->prevent_access();

        // Assert.
        $this->assertThat($resultado, $this->identicalTo($this->no_disponible()));
    }

    public function test_camino_05_en_el_ultimo_segundo_de_gracia(): void {
        // Arrange.
        $regla = $this->regla(2300);

        // Act.
        $resultado = $regla->prevent_access();

        // Assert.
        $this->assertThat($resultado, $this->isFalse());
    }

    public function test_camino_06_vencido_el_periodo_de_gracia(): void {
        // Arrange.
        $regla = $this->regla(2301);

        // Act.
        $resultado = $regla->prevent_access();

        // Assert.
        $this->assertThat($resultado, $this->identicalTo($this->no_disponible()));
    }
}
