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

namespace assignsubmission_onlinetext;

defined('MOODLE_INTERNAL') || die();

global $CFG;
require_once($CFG->dirroot . '/mod/assign/locallib.php');
require_once($CFG->dirroot . '/mod/assign/submission/onlinetext/lib.php');

/**
 * La búsqueda del archivo pedido en assignsubmission_onlinetext_pluginfile() (archivos del texto en línea).
 *
 * Pruebas de caracterización escritas antes de MOOD-DEF-002, que cambia la búsqueda por la ruta
 * calculada con sha1() por file_storage::get_file(). Fijan que solo se sirve el archivo exacto. Que
 * el archivo existente sí se sirve lo comprueban las pruebas de API (MOOD-CP-263), porque
 * send_stored_file() cierra los búferes de salida y no se puede llamar dentro de PHPUnit.
 *
 * @package    assignsubmission_onlinetext
 * @category   test
 * @copyright  2026 Juan Sebastian Ospina Lora
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
#[\PHPUnit\Framework\Attributes\CoversFunction('assignsubmission_onlinetext_pluginfile')]
final class pluginfile_test extends \advanced_testcase {

    /** @var \stdClass El curso. */
    private \stdClass $curso;

    /** @var \cm_info El módulo de la tarea. */
    private \cm_info $cm;

    /** @var \context_module El contexto de la tarea. */
    private \context_module $contexto;

    /** @var int La entrega del estudiante, con una imagen en el texto. */
    private int $entrega;

    #[\Override]
    protected function setUp(): void {
        parent::setUp();
        $this->resetAfterTest();
        $this->curso = $this->getDataGenerator()->create_course();
        $estudiante = $this->getDataGenerator()->create_and_enrol($this->curso, 'student');
        $tarea = $this->getDataGenerator()->create_module('assign', [
            'course' => $this->curso->id,
            'assignsubmission_onlinetext_enabled' => 1,
        ]);
        $this->contexto = \context_module::instance($tarea->cmid);
        $this->entrega = (int) (new \assign($this->contexto, null, $this->curso))
            ->get_user_submission($estudiante->id, true)->id;
        $fs = get_file_storage();
        $fs->create_file_from_string([
            'contextid' => $this->contexto->id,
            'component' => 'assignsubmission_onlinetext',
            'filearea' => ASSIGNSUBMISSION_ONLINETEXT_FILEAREA,
            'itemid' => $this->entrega,
            'filepath' => '/',
            'filename' => 'imagen.txt',
        ], 'Contenido de la imagen');
        $fs->create_directory($this->contexto->id, 'assignsubmission_onlinetext', ASSIGNSUBMISSION_ONLINETEXT_FILEAREA,
            $this->entrega, '/carpeta/');
        $this->setUser($estudiante);
        // El módulo, visto por el estudiante: require_login() revisa que lo pueda ver.
        $this->cm = get_fast_modinfo($this->curso)->get_cm($tarea->cmid);
    }

    /**
     * Rutas, después del id de la entrega, que no corresponden a un archivo.
     *
     * @return array
     */
    public static function rutas_que_no_se_sirven(): array {
        return [
            'un archivo que no existe' => [['no-existe.txt']],
            'el mismo nombre en otra carpeta' => [['carpeta', 'imagen.txt']],
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
        $resultado = assignsubmission_onlinetext_pluginfile($this->curso, $this->cm, $this->contexto,
            ASSIGNSUBMISSION_ONLINETEXT_FILEAREA, array_merge([$this->entrega], $ruta), true);

        // Assert.
        $this->assertFalse($resultado);
    }
}
