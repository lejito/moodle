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

use enrol_self\form\enrol_form;
use stdClass;

/**
 * Caja blanca de RF-MOOD-01 (conexión): un test por camino de enrol_form::validation().
 *
 * El formulario se construye como lo hace el modal del navegador: con el curso y la instancia en
 * los datos de la petición AJAX.
 *
 * @package    enrol_self
 * @category   test
 * @copyright  2026 Juan Sebastian Ospina Lora
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
#[\PHPUnit\Framework\Attributes\CoversMethod(enrol_form::class, 'validation')]
final class enrol_form_validation_test extends \advanced_testcase {

    /** @var string Clave de la instancia. */
    private const CLAVE = 'Clave-2026';

    /** @var string Clave distinta de la de la instancia. */
    private const OTRA_CLAVE = 'Otra-2026';

    /** @var stdClass Curso de la prueba. */
    private stdClass $course;

    #[\Override]
    protected function setUp(): void {
        parent::setUp();
        $this->resetAfterTest();
        $this->course = $this->getDataGenerator()->create_course();
        $this->setUser($this->getDataGenerator()->create_user());
    }

    /**
     * Activa la instancia de automatriculación del curso con la clave y la opción de claves de grupo dadas.
     *
     * @param int $clavesdegrupo Valor de customint1.
     * @return stdClass La instancia.
     */
    private function instancia(int $clavesdegrupo): stdClass {
        global $DB;
        $id = $DB->get_field('enrol', 'id', ['courseid' => $this->course->id, 'enrol' => 'self'], MUST_EXIST);
        $DB->update_record('enrol', (object) [
            'id' => $id,
            'status' => ENROL_INSTANCE_ENABLED,
            'customint6' => 1,
            'password' => self::CLAVE,
            'customint1' => $clavesdegrupo,
        ]);
        return $DB->get_record('enrol', ['id' => $id], '*', MUST_EXIST);
    }

    /**
     * El formulario del modal, armado como un envío AJAX del navegador.
     *
     * Con $isajaxsubmission en true, el constructor valida el contexto y el acceso, y carga la
     * instancia que definition() necesita, igual que en la petición real.
     *
     * @param stdClass $instance
     * @return enrol_form
     */
    private function formulario(stdClass $instance): enrol_form {
        return new enrol_form(null, null, 'post', '', [], true,
            ['id' => $this->course->id, 'instance' => $instance->id], true);
    }

    public function test_camino_01_clave_de_grupo_invalida(): void {
        // Arrange.
        $form = $this->formulario($this->instancia(1));

        // Act.
        $errores = $form->validation(['enrolpassword' => self::OTRA_CLAVE], []);

        // Assert.
        $this->assertThat($errores, $this->identicalTo(
            ['enrolpassword' => get_string('passwordinvalid', 'enrol_self')]));
    }

    public function test_camino_02_clave_de_grupo_valida(): void {
        // Arrange.
        $this->getDataGenerator()->create_group(['courseid' => $this->course->id, 'enrolmentkey' => self::OTRA_CLAVE]);
        $form = $this->formulario($this->instancia(1));

        // Act.
        $errores = $form->validation(['enrolpassword' => self::OTRA_CLAVE], []);

        // Assert.
        $this->assertThat($errores, $this->isEmpty());
    }

    public function test_camino_03_clave_incorrecta_con_pista(): void {
        // Arrange.
        set_config('showhint', 1, 'enrol_self');
        $form = $this->formulario($this->instancia(0));

        // Act.
        $errores = $form->validation(['enrolpassword' => self::OTRA_CLAVE], []);

        // Assert: la pista es la primera letra de la clave.
        $this->assertThat($errores, $this->identicalTo(
            ['enrolpassword' => get_string('passwordinvalidhint', 'enrol_self', 'C')]));
    }

    public function test_camino_04_clave_incorrecta_sin_pista(): void {
        // Arrange.
        set_config('showhint', 0, 'enrol_self');
        $form = $this->formulario($this->instancia(0));

        // Act.
        $errores = $form->validation(['enrolpassword' => self::OTRA_CLAVE], []);

        // Assert.
        $this->assertThat($errores, $this->identicalTo(
            ['enrolpassword' => get_string('passwordinvalid', 'enrol_self')]));
    }

    public function test_camino_05_clave_correcta(): void {
        // Arrange.
        $form = $this->formulario($this->instancia(0));

        // Act.
        $errores = $form->validation(['enrolpassword' => self::CLAVE], []);

        // Assert.
        $this->assertThat($errores, $this->isEmpty());
    }
}
