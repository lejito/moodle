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

namespace enrol_self\caja_negra;

use enrol_self_plugin;
use stdClass;

/**
 * Caja negra de RF-MOOD-01: los límites al segundo de las fechas de la automatriculación.
 *
 * Casos MOOD-CP-112 y MOOD-CP-113 (docs del proyecto, caja negra de RF-MOOD-01). La
 * automatriculación compara con la hora del sistema (time()), que no se puede congelar. Por eso
 * cada comprobación fija la fecha en el segundo actual y se repite si el segundo cambió mientras
 * corría.
 *
 * @package    enrol_self
 * @category   test
 * @copyright  2026 Juan Sebastian Ospina Lora
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
#[\PHPUnit\Framework\Attributes\CoversMethod(enrol_self_plugin::class, 'can_self_enrol')]
final class limites_de_tiempo_test extends \advanced_testcase {

    /** @var enrol_self_plugin El plugin de automatriculación. */
    private enrol_self_plugin $plugin;

    /** @var stdClass La instancia de automatriculación del curso, activa y con matrículas nuevas. */
    private stdClass $instancia;

    #[\Override]
    protected function setUp(): void {
        global $DB;
        parent::setUp();
        $this->resetAfterTest();

        $this->plugin = enrol_get_plugin('self');
        $curso = $this->getDataGenerator()->create_course();
        $this->instancia = $DB->get_record('enrol', ['courseid' => $curso->id, 'enrol' => 'self'], '*', MUST_EXIST);
        $this->instancia->status = ENROL_INSTANCE_ENABLED;
        $this->instancia->customint6 = 1;
        $this->setUser($this->getDataGenerator()->create_user());
    }

    /**
     * Si el usuario puede automatricularse con las fechas que arma $fechas a partir del segundo actual.
     *
     * @param callable $fechas recibe el segundo actual y devuelve [inicio, fin] (0 = sin fecha)
     * @return array [segundo usado, resultado de can_self_enrol()]
     */
    private function puede_en_este_segundo(callable $fechas): array {
        for ($intento = 0; $intento < 5; $intento++) {
            $ahora = time();
            [$this->instancia->enrolstartdate, $this->instancia->enrolenddate] = $fechas($ahora);
            $resultado = $this->plugin->can_self_enrol($this->instancia);
            if (time() === $ahora) {
                return [$ahora, $resultado];
            }
        }
        $this->fail('El segundo cambió en cada intento: no se pudo comprobar el límite.');
    }

    public function test_mood_cp_112_fecha_de_inicio(): void {
        // Arrange y Act: la hora es t0 - 1 (el inicio queda un segundo después) y luego t0.
        [$t0, $antes] = $this->puede_en_este_segundo(fn(int $ahora) => [$ahora + 1, 0]);
        [, $justo] = $this->puede_en_este_segundo(fn(int $ahora) => [$ahora, 0]);

        // Assert: un segundo antes todavía no empieza; en el inicio ya se puede.
        $this->assertSame(get_string('canntenrolearly', 'enrol_self', userdate($t0 + 1)), $antes);
        $this->assertTrue($justo);
    }

    public function test_mood_cp_113_fecha_de_fin(): void {
        // Arrange y Act: la hora es t1 (el fin es este segundo) y luego t1 + 1.
        [, $justo] = $this->puede_en_este_segundo(fn(int $ahora) => [0, $ahora]);
        [$t, $despues] = $this->puede_en_este_segundo(fn(int $ahora) => [0, $ahora - 1]);

        // Assert: en el fin todavía se puede; un segundo después ya terminó.
        $this->assertTrue($justo);
        $this->assertSame(get_string('canntenrollate', 'enrol_self', userdate($t - 1)), $despues);
    }
}
