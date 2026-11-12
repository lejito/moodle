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

namespace mod_forum\caja_blanca;

use context_module;
use mod_forum_external;
use moodle_exception;

defined('MOODLE_INTERNAL') || die();

global $CFG;
require_once($CFG->dirroot . '/mod/forum/externallib.php');

/**
 * Caja blanca de RF-MOOD-05 (conexión): un test por camino de mod_forum_external::validate_post_options().
 *
 * El método valida las opciones que envía la respuesta en línea y las combina con los valores por
 * defecto. Se extrajo de add_discussion_post() para bajar su complejidad cognitiva; estas pruebas se
 * escribieron antes de extraerlo (ciclo TDD).
 *
 * @package    mod_forum
 * @category   test
 * @copyright  2026 Juan Sebastian Ospina Lora
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
#[\PHPUnit\Framework\Attributes\CoversMethod(mod_forum_external::class, 'validate_post_options')]
final class validate_post_options_test extends \advanced_testcase {

    /** @var context_module Contexto del foro. */
    private context_module $context;

    #[\Override]
    protected function setUp(): void {
        parent::setUp();
        $this->resetAfterTest();
        $course = $this->getDataGenerator()->create_course();
        $forum = $this->getDataGenerator()->create_module('forum', ['course' => $course->id]);
        $this->context = context_module::instance($forum->cmid);
        $this->setUser($this->getDataGenerator()->create_and_enrol($course, 'student'));
    }

    /**
     * Llama al método protegido.
     *
     * @param array $options Opciones como las envía el navegador: cada una con name y value.
     * @return array
     */
    private function validar(array $options): array {
        $metodo = new \ReflectionMethod(mod_forum_external::class, 'validate_post_options');
        return $metodo->invoke(null, $options, true, $this->context);
    }

    /**
     * Los valores por defecto, con la suscripción en true.
     *
     * @return array
     */
    private function por_defecto(): array {
        return [
            'discussionsubscribe' => true,
            'private' => false,
            'inlineattachmentsid' => 0,
            'attachmentsid' => null,
            'topreferredformat' => false,
        ];
    }

    public function test_camino_01_opcion_desconocida(): void {
        // Arrange.
        $options = [['name' => 'foo', 'value' => '1']];

        // Assert.
        $this->expectException(moodle_exception::class);
        $this->expectExceptionMessage(get_string('errorinvalidparam', 'webservice', 'foo'));

        // Act.
        $this->validar($options);
    }

    public function test_camino_02_adjuntos_sin_permiso(): void {
        // Arrange.
        global $DB;
        assign_capability('mod/forum:createattachment', CAP_PROHIBIT,
            $DB->get_field('role', 'id', ['shortname' => 'student']), $this->context->id, true);
        $options = [['name' => 'attachmentsid', 'value' => '42']];

        // Act.
        $validadas = $this->validar($options);

        // Assert: sin permiso los adjuntos se anulan.
        $this->assertThat($validadas, $this->identicalTo(array_merge($this->por_defecto(), ['attachmentsid' => 0])));
    }

    public function test_camino_03_adjuntos_con_permiso(): void {
        // Arrange.
        $options = [['name' => 'attachmentsid', 'value' => '42']];

        // Act.
        $validadas = $this->validar($options);

        // Assert.
        $this->assertThat($validadas, $this->identicalTo(array_merge($this->por_defecto(), ['attachmentsid' => 42])));
    }

    public function test_camino_04_opcion_booleana(): void {
        // Arrange.
        $options = [['name' => ' private ', 'value' => '1']];

        // Act.
        $validadas = $this->validar($options);

        // Assert: el nombre se limpia de espacios y PARAM_BOOL convierte el valor en 1.
        $this->assertThat($validadas, $this->identicalTo(array_merge($this->por_defecto(), ['private' => 1])));
    }

    public function test_camino_05_sin_opciones(): void {
        // Arrange.
        $options = [];

        // Act.
        $validadas = $this->validar($options);

        // Assert.
        $this->assertThat($validadas, $this->identicalTo($this->por_defecto()));
    }
}
