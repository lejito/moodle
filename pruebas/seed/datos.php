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

/**
 * Los datos sembrados que comparten sembrar.php y preparar.php.
 *
 * Las suites de pruebas/ no los copian: preparar.php se los entrega en cada caso.
 *
 * @package    core
 * @copyright  2026 Juan Sebastian Ospina Lora
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

defined('MOODLE_INTERNAL') || die();

const CURSO_CORTO = 'LAB-PRUEBAS';
const CURSO_NOMBRE = 'Laboratorio de pruebas de software';
const CLAVE_MATRICULA = 'Clave-2026';
const CONTRASENA = 'Pruebas-2026';
const USUARIOS = [
    // Matriculado como estudiante: entrega, presenta el cuestionario y participa en el foro.
    'estudiante.a' => ['firstname' => 'Ana', 'lastname' => 'Estudiante', 'rol' => 'student'],
    // Sin matricular: es quien se automatricula con la clave (RF-MOOD-01).
    'estudiante.b' => ['firstname' => 'Bruno', 'lastname' => 'Estudiante', 'rol' => null],
    // Califica las entregas y abre el debate del foro.
    'docente' => ['firstname' => 'Diana', 'lastname' => 'Docente', 'rol' => 'editingteacher'],
];
