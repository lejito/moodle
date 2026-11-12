# Instala SonarQube Community Build en Windows, sin Docker, con la memoria ajustada a un equipo de 8 GB.
#
#   powershell -ExecutionPolicy Bypass -File pruebas\sonarqube\instalar.ps1
#   powershell -ExecutionPolicy Bypass -File pruebas\sonarqube\instalar.ps1 -Destino D:\sonarqube
#
# Necesita Java 21 (winget install EclipseAdoptium.Temurin.21.JDK). Usa la base de datos que trae
# SonarQube, así que no hace falta instalar PostgreSQL. Después se inicia con iniciar.ps1.
param(
    [string]$Destino = "$env:USERPROFILE\sonarqube",
    # Un zip ya descargado, para no bajarlo otra vez.
    [string]$Zip = ''
)
$ErrorActionPreference = 'Stop'
$Version = '26.10.0.133078'

# 1. Java 21 o 25, que es lo que acepta esta versión.
$java = Get-Command java -ErrorAction SilentlyContinue
if (-not $java) {
    throw 'Falta Java. Instálalo con: winget install EclipseAdoptium.Temurin.21.JDK (y abre otra terminal).'
}
# java -version escribe en stderr, que Windows PowerShell trataría como error; cmd lo pasa a stdout.
$versionJava = (cmd /c 'java -version 2>&1' | Select-Object -First 1)
if ($versionJava -notmatch '"(21|25)[."]') {
    throw "SonarQube $Version necesita Java 21 o 25, y el java del PATH es: $versionJava"
}

# 2. Descarga y descompresión.
$carpeta = Join-Path $Destino "sonarqube-$Version"
if (Test-Path $carpeta) {
    Write-Host "SonarQube $Version ya está en $carpeta."
} else {
    if (-not $Zip) {
        $Zip = Join-Path $env:TEMP "sonarqube-$Version.zip"
        if (-not (Test-Path $Zip)) {
            Write-Host "Descargando SonarQube $Version (~1 GB)..."
            $ProgressPreference = 'SilentlyContinue'
            Invoke-WebRequest "https://binaries.sonarsource.com/Distribution/sonarqube/sonarqube-$Version.zip" -OutFile $Zip
        }
    }
    Write-Host "Descomprimiendo en $Destino (tarda unos minutos)..."
    New-Item -ItemType Directory -Force $Destino | Out-Null
    & tar.exe -xf $Zip -C $Destino
    if ($LASTEXITCODE -ne 0) { throw "No se pudo descomprimir $Zip" }
}

# 3. Memoria: por defecto los tres procesos de Java pueden crecer hasta ~3 GB. Con estos topes usan
# alrededor de 1,5 GB, suficiente para analizar los componentes del proyecto.
$propiedades = Join-Path $carpeta 'conf\sonar.properties'
$marca = '# Proyecto de pruebas: memoria para un equipo de 8 GB.'
if (-not (Select-String -Path $propiedades -SimpleMatch $marca -Quiet)) {
    Add-Content -Path $propiedades -Encoding ascii -Value @(
        '',
        $marca,
        'sonar.web.javaOpts=-Xms128m -Xmx512m -XX:+HeapDumpOnOutOfMemoryError',
        'sonar.ce.javaOpts=-Xms128m -Xmx768m -XX:+HeapDumpOnOutOfMemoryError',
        'sonar.search.javaOpts=-Xms512m -Xmx512m -XX:MaxDirectMemorySize=256m -XX:+HeapDumpOnOutOfMemoryError'
    )
}

Write-Host ''
Write-Host "Listo. SonarQube quedó en $carpeta."
Write-Host 'Para iniciarlo: powershell -ExecutionPolicy Bypass -File pruebas\sonarqube\iniciar.ps1'
