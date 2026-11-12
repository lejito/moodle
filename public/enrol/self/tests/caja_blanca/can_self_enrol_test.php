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

namespace enrol_self\caja_blanca;

use context_course;
use enrol_self_plugin;
use stdClass;

defined('MOODLE_INTERNAL') || die();

global $CFG;
require_once($CFG->dirroot . '/enrol/self/lib.php');

/**
 * Caja blanca de RF-MOOD-01 (back): un test por camino de enrol_self_plugin::can_self_enrol().
 *
 * Los caminos 1 a 5 omiten $checkuserenrolment, los 6 a 10 lo pasan en true y los 11 a 13 en false.
 * Los caminos que dependen de is_self_enrol_available() reemplazan ese método con un mock, para fijar
 * el mensaje que devuelve sin depender de fechas.
 *
 * @package    enrol_self
 * @category   test
 * @copyright  2026 Juan Sebastian Ospina Lora
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
#[\PHPUnit\Framework\Attributes\CoversMethod(enrol_self_plugin::class, 'can_self_enrol')]
final class can_self_enrol_test extends \advanced_testcase {

    /** @var stdClass Curso de la prueba. */
    private stdClass $course;

    /** @var stdClass Instancia de automatriculación, activa y abierta. */
    private stdClass $instance;

    /** @var stdClass Usuario que intenta matricularse. */
    private stdClass $user;

    #[\Override]
    protected function setUp(): void {
        global $DB;
        parent::setUp();
        $this->resetAfterTest();

        $this->course = $this->getDataGenerator()->create_course();
        $instanceid = $DB->get_field('enrol', 'id', ['courseid' => $this->course->id, 'enrol' => 'self'], MUST_EXIST);
        $DB->update_record('enrol', (object) [
            'id' => $instanceid,
            'status' => ENROL_INSTANCE_ENABLED,
            'customint6' => 1,
        ]);
        $this->instance = $DB->get_record('enrol', ['id' => $instanceid], '*', MUST_EXIST);
        $this->user = $this->getDataGenerator()->create_user();
    }

    /**
     * El plugin real.
     *
     * @return enrol_self_plugin
     */
    private function plugin(): enrol_self_plugin {
        return enrol_get_plugin('self');
    }

    /**
     * Un plugin cuyo is_self_enrol_available() devuelve un mensaje fijo y debe llamarse una sola vez.
     *
     * @param string $mensaje Lo que devuelve is_self_enrol_available().
     * @return enrol_self_plugin
     */
    private function plugin_no_disponible(string $mensaje): enrol_self_plugin {
        $plugin = $this->getMockBuilder(enrol_self_plugin::class)
            ->onlyMethods(['is_self_enrol_available'])
            ->getMock();
        $plugin->expects($this->once())
            ->method('is_self_enrol_available')
            ->with($this->instance)
            ->willReturn($mensaje);
        return $plugin;
    }

    /**
     * Matricula al usuario por esta instancia, para que ya exista su registro en user_enrolments.
     */
    private function matricular_usuario(): void {
        $this->plugin()->enrol_user($this->instance, $this->user->id);
    }

    /**
     * Quita al usuario autenticado la capacidad de automatricularse en el curso.
     */
    private function prohibir_automatricula(): void {
        global $CFG;
        assign_capability('enrol/self:enrolself', CAP_PROHIBIT, $CFG->defaultuserroleid,
            context_course::instance($this->course->id)->id, true);
    }

    /**
     * Mensaje que da el plugin cuando la matrícula todavía no abre.
     *
     * @return string
     */
    private function mensaje_temprano(): string {
        return get_string('canntenrolearly', 'enrol_self', userdate(time() + DAYSECS));
    }

    public function test_camino_01_omitido_invitado(): void {
        // Arrange.
        $this->setGuestUser();

        // Act.
        $resultado = $this->plugin()->can_self_enrol($this->instance);

        // Assert.
        $this->assertThat($resultado, $this->stringStartsWith(get_string('noguestaccess', 'enrol')));
    }

    public function test_camino_02_omitido_ya_matriculado(): void {
        // Arrange.
        $this->matricular_usuario();
        $this->setUser($this->user);

        // Act.
        $resultado = $this->plugin()->can_self_enrol($this->instance);

        // Assert.
        $this->assertThat($resultado, $this->identicalTo(get_string('canntenrol', 'enrol_self')));
    }

    public function test_camino_03_omitido_no_disponible(): void {
        // Arrange.
        $this->setUser($this->user);
        $mensaje = $this->mensaje_temprano();
        $plugin = $this->plugin_no_disponible($mensaje);

        // Act.
        $resultado = $plugin->can_self_enrol($this->instance);

        // Assert.
        $this->assertThat($resultado, $this->identicalTo($mensaje));
    }

    public function test_camino_04_omitido_sin_capacidad(): void {
        // Arrange.
        $this->prohibir_automatricula();
        $this->setUser($this->user);

        // Act.
        $resultado = $this->plugin()->can_self_enrol($this->instance);

        // Assert.
        $this->assertThat($resultado, $this->identicalTo(get_string('canntenrol', 'enrol_self')));
    }

    public function test_camino_05_omitido_puede_matricularse(): void {
        // Arrange.
        $this->setUser($this->user);

        // Act.
        $resultado = $this->plugin()->can_self_enrol($this->instance);

        // Assert.
        $this->assertThat($resultado, $this->isTrue());
    }

    public function test_camino_06_true_invitado(): void {
        // Arrange.
        $this->setGuestUser();

        // Act.
        $resultado = $this->plugin()->can_self_enrol($this->instance, true);

        // Assert.
        $this->assertThat($resultado, $this->stringStartsWith(get_string('noguestaccess', 'enrol')));
    }

    public function test_camino_07_true_ya_matriculado(): void {
        // Arrange.
        $this->matricular_usuario();
        $this->setUser($this->user);

        // Act.
        $resultado = $this->plugin()->can_self_enrol($this->instance, true);

        // Assert.
        $this->assertThat($resultado, $this->identicalTo(get_string('canntenrol', 'enrol_self')));
    }

    public function test_camino_08_true_no_disponible(): void {
        // Arrange.
        $this->setUser($this->user);
        $mensaje = $this->mensaje_temprano();
        $plugin = $this->plugin_no_disponible($mensaje);

        // Act.
        $resultado = $plugin->can_self_enrol($this->instance, true);

        // Assert.
        $this->assertThat($resultado, $this->identicalTo($mensaje));
    }

    public function test_camino_09_true_sin_capacidad(): void {
        // Arrange.
        $this->prohibir_automatricula();
        $this->setUser($this->user);

        // Act.
        $resultado = $this->plugin()->can_self_enrol($this->instance, true);

        // Assert.
        $this->assertThat($resultado, $this->identicalTo(get_string('canntenrol', 'enrol_self')));
    }

    public function test_camino_10_true_puede_matricularse(): void {
        // Arrange.
        $this->setUser($this->user);

        // Act.
        $resultado = $this->plugin()->can_self_enrol($this->instance, true);

        // Assert.
        $this->assertThat($resultado, $this->isTrue());
    }

    public function test_camino_11_false_no_disponible(): void {
        // Arrange.
        $this->setUser($this->user);
        $mensaje = $this->mensaje_temprano();
        $plugin = $this->plugin_no_disponible($mensaje);

        // Act.
        $resultado = $plugin->can_self_enrol($this->instance, false);

        // Assert.
        $this->assertThat($resultado, $this->identicalTo($mensaje));
    }

    public function test_camino_12_false_sin_capacidad(): void {
        // Arrange.
        $this->prohibir_automatricula();
        $this->setUser($this->user);

        // Act.
        $resultado = $this->plugin()->can_self_enrol($this->instance, false);

        // Assert.
        $this->assertThat($resultado, $this->identicalTo(get_string('canntenrol', 'enrol_self')));
    }

    public function test_camino_13_false_puede_matricularse(): void {
        // Arrange.
        $this->setUser($this->user);

        // Act.
        $resultado = $this->plugin()->can_self_enrol($this->instance, false);

        // Assert.
        $this->assertThat($resultado, $this->isTrue());
    }
}
