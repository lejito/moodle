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

use mod_forum\local\container;
use mod_forum\local\managers\capability;
use stdClass;

/**
 * Caja blanca de RF-MOOD-05 (back): un test por camino de capability::can_post_in_discussion().
 *
 * El límite de mensajes se configura con warnafter = 1 y blockafter = 2 en un día: con un mensaje del
 * estudiante, forum_check_throttling() devuelve un aviso que todavía permite publicar; con dos, uno
 * que lo bloquea.
 *
 * @package    mod_forum
 * @category   test
 * @copyright  2026 Juan Sebastian Ospina Lora
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
#[\PHPUnit\Framework\Attributes\CoversMethod(capability::class, 'can_post_in_discussion')]
final class can_post_in_discussion_test extends \advanced_testcase {

    /** @var stdClass Curso de la prueba. */
    private stdClass $course;

    /** @var stdClass Estudiante que quiere responder. */
    private stdClass $student;

    #[\Override]
    protected function setUp(): void {
        parent::setUp();
        $this->resetAfterTest();
        $this->course = $this->getDataGenerator()->create_course();
        $this->student = $this->getDataGenerator()->create_and_enrol($this->course, 'student');
    }

    /**
     * Un foro con un debate abierto por el docente y los mensajes previos del estudiante.
     *
     * @param bool $conlimite Si el foro limita los mensajes por día.
     * @param int $mensajesprevios Mensajes que el estudiante ya publicó hoy en el debate.
     * @return array El gestor de permisos del foro y la entidad del debate.
     */
    private function escenario(bool $conlimite, int $mensajesprevios): array {
        $teacher = $this->getDataGenerator()->create_and_enrol($this->course, 'editingteacher');
        $forumrecord = $this->getDataGenerator()->create_module('forum', [
            'course' => $this->course->id,
            'blockperiod' => $conlimite ? DAYSECS : 0,
            'blockafter' => $conlimite ? 2 : 0,
            'warnafter' => $conlimite ? 1 : 0,
        ]);
        $generator = $this->getDataGenerator()->get_plugin_generator('mod_forum');
        $discussionrecord = $generator->create_discussion([
            'course' => $this->course->id,
            'forum' => $forumrecord->id,
            'userid' => $teacher->id,
        ]);
        for ($i = 0; $i < $mensajesprevios; $i++) {
            $generator->create_post([
                'discussion' => $discussionrecord->id,
                'parent' => $discussionrecord->firstpost,
                'userid' => $this->student->id,
            ]);
        }

        $vaults = container::get_vault_factory();
        $forum = $vaults->get_forum_vault()->get_from_id($forumrecord->id);
        $discussion = $vaults->get_discussion_vault()->get_from_id($discussionrecord->id);

        // forum_check_throttling() cuenta los mensajes de $USER, no los del usuario que recibe
        // can_post_in_discussion(): el estudiante tiene que ser el usuario de la sesión.
        $this->setUser($this->student);
        return [container::get_manager_factory()->get_capability_manager($forum), $discussion];
    }

    public function test_camino_01_aviso_que_todavia_permite_publicar(): void {
        // Arrange.
        [$capabilitymanager, $discussion] = $this->escenario(true, 1);

        // Act.
        $puede = $capabilitymanager->can_post_in_discussion($this->student, $discussion);

        // Assert.
        $this->assertThat($puede, $this->isTrue());
    }

    public function test_camino_02_limite_alcanzado(): void {
        // Arrange.
        [$capabilitymanager, $discussion] = $this->escenario(true, 2);

        // Act.
        $puede = $capabilitymanager->can_post_in_discussion($this->student, $discussion);

        // Assert.
        $this->assertThat($puede, $this->isFalse());
    }

    public function test_camino_03_sin_permiso_para_responder(): void {
        global $DB;

        // Arrange: hay aviso de límite, pero el estudiante no puede responder.
        [$capabilitymanager, $discussion] = $this->escenario(true, 1);
        assign_capability('mod/forum:replypost', CAP_PROHIBIT, $DB->get_field('role', 'id', ['shortname' => 'student']),
            \context_course::instance($this->course->id)->id, true);

        // Act.
        $puede = $capabilitymanager->can_post_in_discussion($this->student, $discussion);

        // Assert.
        $this->assertThat($puede, $this->isFalse());
    }

    public function test_camino_04_foro_sin_limite(): void {
        // Arrange.
        [$capabilitymanager, $discussion] = $this->escenario(false, 3);

        // Act.
        $puede = $capabilitymanager->can_post_in_discussion($this->student, $discussion);

        // Assert: sin límite se retorna directamente lo que decidió forum_user_can_post().
        $this->assertThat($puede, $this->isTrue());
    }
}
