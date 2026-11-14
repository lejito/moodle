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

namespace mod_quiz;

defined('MOODLE_INTERNAL') || die();

global $CFG;
require_once($CFG->dirroot . '/mod/quiz/lib.php');
require_once($CFG->dirroot . '/mod/quiz/locallib.php');

/**
 * La búsqueda del archivo pedido en quiz_pluginfile() y quiz_question_pluginfile().
 *
 * Pruebas de caracterización escritas antes de MOOD-DEF-002, que cambia la búsqueda por la ruta
 * calculada con sha1() por file_storage::get_file(). Fijan que solo se sirve el archivo exacto: el de
 * la retroalimentación general del cuestionario y el del enunciado de una pregunta durante un intento.
 * Que el archivo existente sí se sirve lo comprueban las pruebas de API (MOOD-CP-461 y 462), porque
 * send_stored_file() cierra los búferes de salida y no se puede llamar dentro de PHPUnit.
 *
 * @package    mod_quiz
 * @category   test
 * @copyright  2026 Juan Sebastian Ospina Lora
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
#[\PHPUnit\Framework\Attributes\CoversFunction('quiz_pluginfile')]
#[\PHPUnit\Framework\Attributes\CoversFunction('quiz_question_pluginfile')]
final class pluginfile_test extends \advanced_testcase {

    /** @var \stdClass El curso. */
    private \stdClass $curso;

    /** @var \cm_info El módulo del cuestionario. */
    private \cm_info $cm;

    /** @var \context_module El contexto del cuestionario. */
    private \context_module $contexto;

    /** @var int La retroalimentación general, con un archivo. */
    private int $retroalimentacion;

    /** @var \stdClass La pregunta, con un archivo en el enunciado. */
    private \stdClass $pregunta;

    /** @var \context El contexto del banco de la pregunta. */
    private \context $contextopregunta;

    /** @var int El uso de preguntas del intento en curso del estudiante. */
    private int $uso;

    #[\Override]
    protected function setUp(): void {
        global $DB, $PAGE;
        parent::setUp();
        $this->resetAfterTest();
        $this->curso = $this->getDataGenerator()->create_course();
        $estudiante = $this->getDataGenerator()->create_and_enrol($this->curso, 'student');
        $generador = $this->getDataGenerator()->get_plugin_generator('mod_quiz');
        $quiz = $generador->create_instance(['course' => $this->curso->id, 'grade' => 10, 'sumgrades' => 1]);
        $this->contexto = \context_module::instance($quiz->cmid);

        $preguntas = $this->getDataGenerator()->get_plugin_generator('core_question');
        $this->pregunta = $preguntas->create_question('shortanswer', null,
            ['category' => $preguntas->create_question_category()->id]);
        quiz_add_quiz_question($this->pregunta->id, $quiz);
        $this->contextopregunta = \context::instance_by_id(
            $DB->get_field('question_categories', 'contextid', ['id' => $this->pregunta->category]));

        $this->retroalimentacion = (int) $DB->insert_record('quiz_feedback', [
            'quizid' => $quiz->id,
            'feedbacktext' => 'Bien',
            'feedbacktextformat' => FORMAT_HTML,
            'mingrade' => 0,
            'maxgrade' => 11,
        ]);

        $fs = get_file_storage();
        $fs->create_file_from_string([
            'contextid' => $this->contexto->id,
            'component' => 'mod_quiz',
            'filearea' => 'feedback',
            'itemid' => $this->retroalimentacion,
            'filepath' => '/',
            'filename' => 'retroalimentacion.txt',
        ], 'Contenido de la retroalimentación');
        $fs->create_directory($this->contexto->id, 'mod_quiz', 'feedback', $this->retroalimentacion, '/carpeta/');
        $fs->create_file_from_string([
            'contextid' => $this->contextopregunta->id,
            'component' => 'question',
            'filearea' => 'questiontext',
            'itemid' => $this->pregunta->id,
            'filepath' => '/',
            'filename' => 'figura.txt',
        ], 'Contenido de la figura');
        $fs->create_directory($this->contextopregunta->id, 'question', 'questiontext', $this->pregunta->id, '/carpeta/');

        $this->setUser($estudiante);
        // El módulo, visto por el estudiante: require_login() revisa que lo pueda ver.
        $this->cm = get_fast_modinfo($this->curso)->get_cm($quiz->cmid);
        $this->uso = (int) $generador->create_attempt($quiz->id, $estudiante->id)->uniqueid;
        // Empezar el intento prepara el tema de la página; require_login() necesita una página nueva.
        $PAGE = new \moodle_page();
    }

    /**
     * Rutas, después del id del ítem, que no corresponden a un archivo.
     *
     * @return array
     */
    public static function rutas_que_no_se_sirven(): array {
        return [
            'un archivo que no existe' => [['no-existe.txt']],
            'un directorio' => [['carpeta', '.']],
            'la raíz del área' => [[]],
        ];
    }

    /**
     * Una ruta que no corresponde a un archivo de la retroalimentación no se sirve.
     *
     * @param array $ruta
     */
    #[\PHPUnit\Framework\Attributes\DataProvider('rutas_que_no_se_sirven')]
    public function test_retroalimentacion_no_sirve_lo_que_no_es_el_archivo_pedido(array $ruta): void {
        // Act.
        $resultado = quiz_pluginfile($this->curso, $this->cm, $this->contexto, 'feedback',
            array_merge([$this->retroalimentacion], $ruta), true);

        // Assert.
        $this->assertFalse($resultado);
    }

    public function test_retroalimentacion_no_sirve_el_mismo_nombre_en_otra_carpeta(): void {
        // Act.
        $resultado = quiz_pluginfile($this->curso, $this->cm, $this->contexto, 'feedback',
            [$this->retroalimentacion, 'carpeta', 'retroalimentacion.txt'], true);

        // Assert.
        $this->assertFalse($resultado);
    }

    /**
     * Pide un archivo del enunciado de la pregunta durante el intento.
     *
     * send_file_not_found() envía la cabecera 404 antes de lanzar la excepción, y PHP avisa porque PHPUnit ya
     * escribió en la salida. Ese aviso, y solo ese, se ignora.
     *
     * @param array $ruta La ruta después del id de la pregunta.
     */
    private function pedir_archivo_de_la_pregunta(array $ruta): void {
        set_error_handler(
            fn(int $nivel, string $mensaje): bool => str_starts_with($mensaje, 'Cannot modify header information'),
            E_WARNING,
        );
        try {
            quiz_question_pluginfile($this->curso, $this->contextopregunta, 'question', 'questiontext',
                $this->uso, 1, array_merge([$this->pregunta->id], $ruta), true);
        } finally {
            restore_error_handler();
        }
    }

    /**
     * Una ruta que no corresponde a un archivo del enunciado de la pregunta responde «no encontrado».
     *
     * @param array $ruta
     */
    #[\PHPUnit\Framework\Attributes\DataProvider('rutas_que_no_se_sirven')]
    public function test_pregunta_no_sirve_lo_que_no_es_el_archivo_pedido(array $ruta): void {
        // Assert.
        $this->expectExceptionObject(new \moodle_exception('filenotfound', 'error'));

        // Act.
        $this->pedir_archivo_de_la_pregunta($ruta);
    }

    public function test_pregunta_no_sirve_el_mismo_nombre_en_otra_carpeta(): void {
        // Assert.
        $this->expectExceptionObject(new \moodle_exception('filenotfound', 'error'));

        // Act.
        $this->pedir_archivo_de_la_pregunta(['carpeta', 'figura.txt']);
    }
}
