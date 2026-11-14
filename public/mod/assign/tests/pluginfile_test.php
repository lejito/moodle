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

namespace mod_assign;

defined('MOODLE_INTERNAL') || die();

global $CFG;
require_once($CFG->dirroot . '/mod/assign/lib.php');

/**
 * La búsqueda del archivo pedido en assign_pluginfile() (adjuntos del enunciado).
 *
 * Pruebas de caracterización escritas antes de MOOD-DEF-002, que cambia la búsqueda por la ruta
 * calculada con sha1() por file_storage::get_file(). Fijan que solo se sirve el archivo exacto. Que
 * el archivo existente sí se sirve lo comprueban las pruebas de API (MOOD-CP-261), porque
 * send_stored_file() cierra los búferes de salida y no se puede llamar dentro de PHPUnit.
 *
 * @package    mod_assign
 * @category   test
 * @copyright  2026 Juan Sebastian Ospina Lora
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
#[\PHPUnit\Framework\Attributes\CoversFunction('assign_pluginfile')]
final class pluginfile_test extends \advanced_testcase {

    /** @var \stdClass El curso. */
    private \stdClass $curso;

    /** @var \cm_info El módulo de la tarea. */
    private \cm_info $cm;

    /** @var \context_module El contexto de la tarea. */
    private \context_module $contexto;

    #[\Override]
    protected function setUp(): void {
        parent::setUp();
        $this->resetAfterTest();
        $this->curso = $this->getDataGenerator()->create_course();
        $tarea = $this->getDataGenerator()->create_module('assign', ['course' => $this->curso->id]);
        $this->contexto = \context_module::instance($tarea->cmid);
        $fs = get_file_storage();
        $fs->create_file_from_string([
            'contextid' => $this->contexto->id,
            'component' => 'mod_assign',
            'filearea' => ASSIGN_INTROATTACHMENT_FILEAREA,
            'itemid' => 0,
            'filepath' => '/',
            'filename' => 'enunciado.txt',
        ], 'Contenido del enunciado');
        $fs->create_directory($this->contexto->id, 'mod_assign', ASSIGN_INTROATTACHMENT_FILEAREA, 0, '/carpeta/');
        $this->setUser($this->getDataGenerator()->create_and_enrol($this->curso, 'student'));
        // El módulo, visto por el estudiante: require_login() revisa que lo pueda ver.
        $this->cm = get_fast_modinfo($this->curso)->get_cm($tarea->cmid);
    }

    /**
     * Rutas, después del ítem 0, que no corresponden a un archivo.
     *
     * @return array
     */
    public static function rutas_que_no_se_sirven(): array {
        return [
            'un archivo que no existe' => [['no-existe.txt']],
            'el mismo nombre en otra carpeta' => [['carpeta', 'enunciado.txt']],
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
        $resultado = assign_pluginfile($this->curso, $this->cm, $this->contexto, ASSIGN_INTROATTACHMENT_FILEAREA,
            array_merge([0], $ruta), true);

        // Assert.
        $this->assertFalse($resultado);
    }
}
