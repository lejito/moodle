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

namespace mod_quiz\caja_blanca;

use mod_quiz\quiz_attempt;

defined('MOODLE_INTERNAL') || die();

global $CFG;
require_once($CFG->dirroot . '/mod/quiz/lib.php');

/**
 * Caja blanca de RF-MOOD-04 (conexión): un test por camino de quiz_attempt::check_page_access().
 *
 * check_page_access() solo consulta el método de navegación y la página actual del intento, así que
 * el intento es un mock parcial que fija esos dos valores: no hace falta crear un cuestionario ni un
 * intento real. La página actual es siempre la 2.
 *
 * @package    mod_quiz
 * @category   test
 * @copyright  2026 Juan Sebastian Ospina Lora
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
#[\PHPUnit\Framework\Attributes\CoversMethod(quiz_attempt::class, 'check_page_access')]
final class check_page_access_test extends \basic_testcase {

    /**
     * Un intento con la navegación dada y la página 2 como actual.
     *
     * @param string $navmethod QUIZ_NAVMETHOD_FREE o QUIZ_NAVMETHOD_SEQ.
     * @return quiz_attempt
     */
    private function intento(string $navmethod): quiz_attempt {
        $intento = $this->createPartialMock(quiz_attempt::class, ['get_navigation_method', 'get_currentpage']);
        $intento->expects($this->once())->method('get_navigation_method')->willReturn($navmethod);
        $intento->method('get_currentpage')->willReturn(2);
        return $intento;
    }

    public function test_camino_01_omitido_navegacion_libre(): void {
        // Arrange: con navegación libre ni siquiera se consulta la página actual.
        $intento = $this->intento(QUIZ_NAVMETHOD_FREE);
        $intento->expects($this->never())->method('get_currentpage');

        // Act.
        $permitido = $intento->check_page_access(7);

        // Assert.
        $this->assertThat($permitido, $this->isTrue());
    }

    public function test_camino_02_omitido_resumen(): void {
        // Arrange.
        $intento = $this->intento(QUIZ_NAVMETHOD_SEQ);

        // Act.
        $permitido = $intento->check_page_access(-1);

        // Assert.
        $this->assertThat($permitido, $this->isTrue());
    }

    public function test_camino_03_omitido_pagina_actual(): void {
        // Arrange.
        $intento = $this->intento(QUIZ_NAVMETHOD_SEQ);

        // Act.
        $permitido = $intento->check_page_access(2);

        // Assert.
        $this->assertThat($permitido, $this->isTrue());
    }

    public function test_camino_04_omitido_pagina_siguiente(): void {
        // Arrange.
        $intento = $this->intento(QUIZ_NAVMETHOD_SEQ);

        // Act.
        $permitido = $intento->check_page_access(3);

        // Assert.
        $this->assertThat($permitido, $this->isTrue());
    }

    public function test_camino_05_omitido_pagina_fuera_de_secuencia(): void {
        // Arrange.
        $intento = $this->intento(QUIZ_NAVMETHOD_SEQ);

        // Act.
        $permitido = $intento->check_page_access(5);

        // Assert.
        $this->assertThat($permitido, $this->isFalse());
    }

    public function test_camino_06_true_navegacion_libre(): void {
        // Arrange.
        $intento = $this->intento(QUIZ_NAVMETHOD_FREE);

        // Act.
        $permitido = $intento->check_page_access(7, true);

        // Assert.
        $this->assertThat($permitido, $this->isTrue());
    }

    public function test_camino_07_true_resumen(): void {
        // Arrange.
        $intento = $this->intento(QUIZ_NAVMETHOD_SEQ);

        // Act.
        $permitido = $intento->check_page_access(-1, true);

        // Assert.
        $this->assertThat($permitido, $this->isTrue());
    }

    public function test_camino_08_true_pagina_actual(): void {
        // Arrange.
        $intento = $this->intento(QUIZ_NAVMETHOD_SEQ);

        // Act.
        $permitido = $intento->check_page_access(2, true);

        // Assert.
        $this->assertThat($permitido, $this->isTrue());
    }

    public function test_camino_09_true_pagina_siguiente(): void {
        // Arrange.
        $intento = $this->intento(QUIZ_NAVMETHOD_SEQ);

        // Act.
        $permitido = $intento->check_page_access(3, true);

        // Assert.
        $this->assertThat($permitido, $this->isTrue());
    }

    public function test_camino_10_true_pagina_fuera_de_secuencia(): void {
        // Arrange.
        $intento = $this->intento(QUIZ_NAVMETHOD_SEQ);

        // Act.
        $permitido = $intento->check_page_access(5, true);

        // Assert.
        $this->assertThat($permitido, $this->isFalse());
    }

    public function test_camino_11_false_pagina_siguiente(): void {
        // Arrange: sin permiso para avanzar, ni la página siguiente es válida.
        $intento = $this->intento(QUIZ_NAVMETHOD_SEQ);

        // Act.
        $permitido = $intento->check_page_access(3, false);

        // Assert.
        $this->assertThat($permitido, $this->isFalse());
    }
}
