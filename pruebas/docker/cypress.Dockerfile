# Imagen de las pruebas E2E en Jenkins: Cypress con sus navegadores, más el cliente de Docker,
# con el que cada caso ejecuta pruebas/seed/preparar.php dentro del contenedor de Moodle
# (docker exec). En el equipo de Juan, Cypress corre con Node instalado y no usa esta imagen.
FROM cypress/included:16.2.1
COPY --from=docker:28.5.1-cli /usr/local/bin/docker /usr/local/bin/docker
# npm ci instala el paquete cypress de pruebas/package.json; el binario ya viene en la imagen.
ENV CYPRESS_INSTALL_BINARY=0
ENTRYPOINT []
