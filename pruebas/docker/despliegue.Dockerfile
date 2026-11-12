# Moodle listo para desplegar: la imagen de PHP de este directorio, con el código del repositorio y
# vendor/ adentro. La construye el Jenkinsfile desde la raíz del repositorio:
#
#   docker build -f pruebas/docker/despliegue.Dockerfile -t moodle-pruebas/app:latest .
#
# vendor/ tiene que estar instalado antes (lo instala la etapa de pruebas unitarias). Lo que no hace
# falta en el sitio queda fuera por despliegue.Dockerfile.dockerignore.
FROM moodle-pruebas/php:8.4

COPY . /var/www/moodle
COPY pruebas/docker/config.php /var/www/moodle/config.php
