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

namespace mod_forum;

defined('MOODLE_INTERNAL') || die();

global $CFG;
require_once($CFG->dirroot . '/mod/forum/lib.php');

/**
 * La búsqueda del archivo pedido en forum_pluginfile().
 *
 * Pruebas de caracterización escritas antes de MOOD-DEF-002, que cambia la búsqueda por la ruta
 * calculada con sha1() por file_storage::get_file(). Fijan que solo se sirve el archivo exacto: nada
 * que no exista, ni el mismo nombre en otra carpeta o en otro mensaje, ni un directorio. Que el
 * archivo existente sí se sirve lo comprueban las pruebas de API (MOOD-CP-563), porque
 * send_stored_file() cierra los búferes de salida y no se puede llamar dentro de PHPUnit.
 *
 * @package    mod_forum
 * @category   test
 * @copyright  2026 Juan Sebastian Ospina Lora
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
#[\PHPUnit\Framework\Attributes\CoversFunction('forum_pluginfile')]
final class pluginfile_test extends \advanced_testcase {

    /** @var \stdClass El curso. */
    private \stdClass $curso;

    /** @var \cm_info El módulo del foro. */
    private \cm_info $cm;

    /** @var \context_module El contexto del foro. */
    private \context_module $contexto;

    /** @var \stdClass La discusión, cuyo primer mensaje tiene el adjunto. */
    private \stdClass $discusion;

    /** @var \stdClass Otro mensaje de la discusión, sin adjuntos. */
    private \stdClass $otro;

    #[\Override]
    protected function setUp(): void {
        parent::setUp();
        $this->resetAfterTest();
        $this->curso = $this->getDataGenerator()->create_course();
        $foro = $this->getDataGenerator()->create_module('forum', ['course' => $this->curso->id]);
        $this->contexto = \context_module::instance($foro->cmid);
        $estudiante = $this->getDataGenerator()->create_and_enrol($this->curso, 'student');
        $generador = $this->getDataGenerator()->get_plugin_generator('mod_forum');
        $this->discusion = $generador->create_discussion([
            'course' => $this->curso->id,
            'forum' => $foro->id,
            'userid' => $estudiante->id,
            'attachment' => 1,
        ]);
        $this->otro = $generador->create_post([
            'discussion' => $this->discusion->id,
            'parent' => $this->discusion->firstpost,
            'userid' => $estudiante->id,
        ]);
        $fs = get_file_storage();
        $fs->create_file_from_string([
            'contextid' => $this->contexto->id,
            'component' => 'mod_forum',
            'filearea' => 'attachment',
            'itemid' => $this->discusion->firstpost,
            'filepath' => '/',
            'filename' => 'adjunto.txt',
        ], 'Contenido del adjunto');
        $fs->create_directory($this->contexto->id, 'mod_forum', 'attachment', $this->discusion->firstpost, '/carpeta/');
        $this->setUser($estudiante);
        // El módulo, visto por el estudiante: require_login() revisa que lo pueda ver.
        $this->cm = get_fast_modinfo($this->curso)->get_cm($foro->cmid);
    }

    /**
     * Rutas, después del id del mensaje, que no corresponden a un archivo.
     *
     * @return array
     */
    public static function rutas_que_no_se_sirven(): array {
        return [
            'un archivo que no existe' => [['no-existe.txt']],
            'el mismo nombre en otra carpeta' => [['carpeta', 'adjunto.txt']],
            'un directorio' => [['carpeta', '.']],
            'la raíz del área' => [[]],
        ];
    }

    /**
     * Una ruta que no corresponde a un archivo no se sirve.
     *
     * @param array $ruta
     */
    #[\PHPUnit\Framework\Attributes\DataProvider('rutas_que_no_se_sirven')]
    public function test_no_sirve_lo_que_no_es_el_archivo_pedido(array $ruta): void {
        // Act.
        $resultado = forum_pluginfile($this->curso, $this->cm, $this->contexto, 'attachment',
            array_merge([$this->discusion->firstpost], $ruta), true);

        // Assert.
        $this->assertFalse($resultado);
    }

    public function test_no_sirve_el_adjunto_pedido_en_otro_mensaje(): void {
        // Act.
        $resultado = forum_pluginfile($this->curso, $this->cm, $this->contexto, 'attachment',
            [$this->otro->id, 'adjunto.txt'], true);

        // Assert.
        $this->assertFalse($resultado);
    }
}
