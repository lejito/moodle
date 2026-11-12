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
 * Configuración de Moodle para el entorno Docker del proyecto de pruebas.
 *
 * Se copia a la raíz del repositorio como config.php, que git ignora:
 *     cp pruebas/docker/config.php config.php
 * Solo funciona dentro de los contenedores de pruebas/docker/compose.yml.
 *
 * @package    core
 * @copyright  2026 Juan Sebastian Ospina Lora
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

unset($CFG);
global $CFG;
$CFG = new stdClass();

$CFG->dbtype    = 'pgsql';
$CFG->dblibrary = 'native';
$CFG->dbhost    = 'db';
$CFG->dbname    = 'moodle';
$CFG->dbuser    = 'moodle';
$CFG->dbpass    = 'moodle';
$CFG->prefix    = 'mdl_';
$CFG->dboptions = ['dbport' => 5432];

// El Moodle desplegado por Jenkins (compose.despliegue.yml) puede usar otro puerto.
$CFG->wwwroot   = getenv('MOODLE_URL') ?: 'http://localhost:8000';
$CFG->dataroot  = '/var/moodledata/data';
$CFG->admin     = 'admin';
$CFG->directorypermissions = 02777;

// PHPUnit usa su propio prefijo de tablas y su propia carpeta de datos, así que
// nunca toca la instalación de Moodle que se usa para las pruebas manuales y E2E.
$CFG->phpunit_prefix   = 'phpu_';
$CFG->phpunit_dataroot = '/var/moodledata/phpunit';

// Igual que la plantilla del pipeline (.github/workflows/config-template.php).
$CFG->debug = E_ALL;
$CFG->debugdisplay = 1;
$CFG->routerconfigured = true;

require_once(__DIR__ . '/lib/setup.php');
