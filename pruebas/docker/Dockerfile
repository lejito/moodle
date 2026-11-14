# PHP 8.4 con lo que Moodle y sus pruebas necesitan, igual que el pipeline
# (.github/workflows/pruebas.yml): las extensiones de composer.json, el
# controlador pgsql y pcov para la cobertura.
#
# La variante con Apache trae también la CLI de PHP, así que la misma imagen
# sirve para PHPUnit y los scripts (servicio moodle), para la web (web) y para
# el cron (cron).
FROM php:8.4-apache-bookworm

COPY --from=mlocati/php-extension-installer:2 /usr/bin/install-php-extensions /usr/local/bin/

# git y unzip los usa Composer para instalar las dependencias. La localización
# en_AU.UTF-8 la exigen algunas pruebas de Moodle; el pipeline la genera igual.
RUN install-php-extensions gd intl zip pgsql pcov exif soap opcache \
  && apt-get update \
  && apt-get install -y --no-install-recommends git unzip locales \
  && sed -i 's/^# *\(en_AU.UTF-8\)/\1/' /etc/locale.gen \
  && locale-gen \
  && rm -rf /var/lib/apt/lists/*

COPY php.ini /usr/local/etc/php/conf.d/zz-moodle.ini
COPY apache.conf /etc/apache2/sites-available/000-default.conf
# Cabeceras de seguridad (hallazgos SEC-01, 03, 04 y 05 de ZAP); necesitan mod_headers.
COPY seguridad.conf /etc/apache2/conf-available/seguridad.conf
RUN a2enmod headers && a2enconf seguridad

WORKDIR /var/www/moodle
