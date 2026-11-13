# Imagen de los escenarios Gherkin con Screenplay en Jenkins: Playwright con Chromium, más el
# cliente de Docker, con el que cada escenario ejecuta pruebas/seed/preparar.php dentro del
# contenedor de Moodle (docker exec). La versión es la del paquete playwright de pruebas/package.json.
# En el equipo de Juan, los escenarios corren con Node instalado y no usan esta imagen.
FROM mcr.microsoft.com/playwright:v1.64.1-noble
COPY --from=docker:28.5.1-cli /usr/local/bin/docker /usr/local/bin/docker
# npm ci instala también Cypress (pruebas/package.json); su binario no hace falta aquí.
ENV CYPRESS_INSTALL_BINARY=0
