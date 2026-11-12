#!/usr/bin/env bash
# Contenedores de las pruebas unitarias de un build de Jenkins: PHP 8.4 (la imagen de pruebas/docker) y
# PostgreSQL 17, en una red propia del build. Lo usa pruebas/jenkins/Jenkinsfile.
#
#   bash pruebas/jenkins/php.sh iniciar             # levanta los dos contenedores
#   bash pruebas/jenkins/php.sh ejecutar <comando>  # corre un comando en el contenedor de PHP
#   bash pruebas/jenkins/php.sh terminar            # los elimina
#
# El contenedor de PHP monta los volúmenes del de Jenkins (--volumes-from), así que ve el clon del
# repositorio en la misma ruta ($WORKSPACE). Usa pruebas/docker/config.php, igual que el entorno local:
# la base de datos se llama db dentro de la red.
set -euo pipefail

nombre=$(printf 'ci-%s' "${BUILD_TAG:-local}" | tr -c 'a-zA-Z0-9_.-' '-' | tr 'A-Z' 'a-z')
espacio=${WORKSPACE:-$PWD}

case ${1:-} in
  iniciar)
    docker network create "$nombre" > /dev/null
    docker run -d --name "$nombre-db" --network "$nombre" --network-alias db \
      -e POSTGRES_DB=moodle -e POSTGRES_USER=moodle -e POSTGRES_PASSWORD=moodle \
      postgres:17 > /dev/null
    # Composer guarda su caché en un volumen que dura entre builds.
    docker run -d --name "$nombre-php" --network "$nombre" --volumes-from "$(hostname)" -w "$espacio" \
      -v moodle-ci-composer:/root/.cache/composer \
      moodle-pruebas/php:8.4 sleep infinity > /dev/null
    docker exec "$nombre-php" mkdir -p /var/moodledata/data /var/moodledata/phpunit
    until docker exec "$nombre-db" pg_isready -h 127.0.0.1 -U moodle -q; do sleep 2; done
    echo "Contenedores $nombre-php y $nombre-db listos."
    ;;
  ejecutar)
    shift
    docker exec -w "$espacio" "$nombre-php" "$@"
    ;;
  terminar)
    # PHP corre como root: los archivos que creó (vendor/, reportes) vuelven al usuario de Jenkins
    # para que el próximo build pueda actualizarlos o borrarlos.
    if docker inspect "$nombre-php" > /dev/null 2>&1; then
      docker exec "$nombre-php" chown -R "$(id -u):$(id -g)" "$espacio" || true
    fi
    docker rm -f "$nombre-php" "$nombre-db" > /dev/null 2>&1 || true
    docker network rm "$nombre" > /dev/null 2>&1 || true
    ;;
  *)
    echo "Uso: $0 iniciar | ejecutar <comando> | terminar" >&2
    exit 2
    ;;
esac
