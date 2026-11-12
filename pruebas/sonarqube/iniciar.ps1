# Inicia SonarQube (instalado con instalar.ps1) en http://localhost:9000 y espera a que esté listo.
# Queda corriendo en su propia ventana; para detenerlo, se cierra esa ventana o se presiona Ctrl+C en ella.
#
#   powershell -ExecutionPolicy Bypass -File pruebas\sonarqube\iniciar.ps1
param([string]$Destino = "$env:USERPROFILE\sonarqube")
$ErrorActionPreference = 'Stop'
$Version = '26.10.0.133078'

$bat = Join-Path $Destino "sonarqube-$Version\bin\windows-x86-64\StartSonar.bat"
if (-not (Test-Path $bat)) { throw "No está SonarQube en $Destino. Corre primero instalar.ps1." }

Start-Process -FilePath $bat -WorkingDirectory (Split-Path $bat)
Write-Host 'Iniciando SonarQube (1 a 3 minutos)...'
for ($i = 0; $i -lt 90; $i++) {
    Start-Sleep -Seconds 4
    try {
        $estado = (Invoke-RestMethod 'http://localhost:9000/api/system/status' -TimeoutSec 3).status
        if ($estado -eq 'UP') { Write-Host 'SonarQube listo en http://localhost:9000'; exit 0 }
    } catch { }
}
throw 'SonarQube no respondió en 6 minutos. Revisa la ventana de SonarQube y la carpeta logs\.'
