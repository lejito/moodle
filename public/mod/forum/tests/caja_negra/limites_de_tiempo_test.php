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

namespace mod_forum\caja_negra;

use stdClass;

defined('MOODLE_INTERNAL') || die();

global $CFG;
require_once($CFG->dirroot . '/mod/forum/lib.php');

/**
 * Caja negra de RF-MOOD-05: el límite al segundo de la fecha de corte del foro.
 *
 * Caso MOOD-CP-515 (docs del proyecto, caja negra de RF-MOOD-05). Se pregunta lo mismo que la
 * página de respuesta: si el estudiante puede publicar en el debate (forum_user_can_post()). El foro
 * compara con la hora del sistema (time()), que no se puede congelar, así que cada comprobación fija
 * el corte en el segundo actual y se repite si el segundo cambió mientras corría.
 *
 * @package    mod_forum
 * @category   test
 * @copyright  2026 Juan Sebastian Ospina Lora
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
#[\PHPUnit\Framework\Attributes\CoversFunction('forum_user_can_post')]
final class limites_de_tiempo_test extends \advanced_testcase {

    /** @var stdClass El foro general del curso. */
    private stdClass $foro;

    /** @var stdClass El debate que abrió el docente. */
    private stdClass $debate;

    /** @var stdClass El estudiante que responde. */
    private stdClass $estudiante;

    #[\Override]
    protected function setUp(): void {
        parent::setUp();
        $this->resetAfterTest();
        $generador = $this->getDataGenerator();
        $curso = $generador->create_course();
        $docente = $generador->create_and_enrol($curso, 'editingteacher');
        $this->estudiante = $generador->create_and_enrol($curso, 'student');
        $this->foro = $generador->create_module('forum', ['course' => $curso->id, 'type' => 'general']);
        $this->debate = $generador->get_plugin_generator('mod_forum')->create_discussion([
            'course' => $curso->id,
            'forum' => $this->foro->id,
            'userid' => $docente->id,
        ]);
        $this->setUser($this->estudiante);
    }

    /**
     * Si el estudiante puede responder con el corte que arma $corte a partir del segundo actual.
     *
     * @param callable $corte recibe el segundo actual y devuelve la fecha de corte
     * @return bool
     */
    private function puede_responder_en_este_segundo(callable $corte): bool {
        $cm = get_coursemodule_from_instance('forum', $this->foro->id);
        $curso = get_course($this->foro->course);
        $contexto = \context_module::instance($cm->id);
        for ($intento = 0; $intento < 5; $intento++) {
            $ahora = time();
            $this->foro->cutoffdate = $corte($ahora);
            $puede = forum_user_can_post($this->foro, $this->debate, $this->estudiante, $cm, $curso, $contexto);
            if (time() === $ahora) {
                return $puede;
            }
        }
        $this->fail('El segundo cambió en cada intento: no se pudo comprobar el límite.');
    }

    public function test_mood_cp_515_corte(): void {
        // Act: la hora es el corte, y luego un segundo después del corte.
        $justo = $this->puede_responder_en_este_segundo(fn(int $ahora) => $ahora);
        $despues = $this->puede_responder_en_este_segundo(fn(int $ahora) => $ahora - 1);

        // Assert: en el corte todavía puede responder; un segundo después, ya no.
        $this->assertTrue($justo);
        $this->assertFalse($despues);
    }
}
