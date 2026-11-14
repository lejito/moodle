"""Lo común a la evaluación con DeepEval: la clave, el modelo juez, Moodle y el reporte.

El resumen lo produce Moodle (aiplacement_courseassist_summarise_text, con el proveedor Gemini que
activa pruebas/seed/ia.php) y lo juzga otro modelo de Gemini a través de DeepEval. correr.sh pasa en
MOODLE_IA el JSON de ia.php (contexto del curso y token).
"""

import json
import os
import time
from pathlib import Path

import pytest
import requests
from deepeval.models import GeminiModel
from google.genai.errors import ServerError

CARPETA = Path(__file__).parent
REPORTES = CARPETA.parent / "reportes" / "deepeval"
CLAVE = os.environ.get("GOOGLE_GENERATIVE_AI_API_KEY", "").strip()
MOODLE_URL = os.environ.get("MOODLE_URL", "http://localhost:8000")
# El juez es Flash-Lite, como el que resume: Flash da solo 20 consultas al día en el plan gratuito, y
# cada caso hace unas diez. DEEPEVAL_MODEL permite usar otro (por ejemplo gemini-3.5-flash).
MODELO_JUEZ = os.environ.get("DEEPEVAL_MODEL", "gemini-3.5-flash-lite")
RESULTADOS: list[dict] = []

# Presupuesto de consultas a Gemini, el mismo de stagehand/soporte/cuota.mts y en el mismo archivo: el
# juez de DeepEval, el resumen de Moodle y Stagehand usan el mismo modelo y la misma clave, así que gastan
# el mismo cupo (15 consultas por minuto en el plan gratuito de Flash-Lite). Se permiten 6 por ventana de
# 62 s, la mitad del límite, porque una métrica puede reintentar una consulta rechazada.
POR_VENTANA = int(os.environ.get("GEMINI_POR_VENTANA", "6"))
VENTANA = 62.0
ARCHIVO_CUOTA = CARPETA.parent / ".cache" / "gemini.json"


def tomar_turno() -> None:
    """Espera hasta que haya lugar en la ventana y lo ocupa. Se llama antes de cada consulta al modelo."""
    while True:
        ahora = time.time() * 1000
        try:
            marcas = json.loads(ARCHIVO_CUOTA.read_text())
        except (OSError, ValueError):
            marcas = []
        recientes = [m for m in marcas if ahora - m < VENTANA * 1000]
        if len(recientes) < POR_VENTANA:
            ARCHIVO_CUOTA.parent.mkdir(parents=True, exist_ok=True)
            ARCHIVO_CUOTA.write_text(json.dumps(recientes + [ahora]))
            return
        time.sleep((VENTANA * 1000 - (ahora - recientes[0])) / 1000 + 0.25)


# Ante un 503 («high demand»), Gemini pide reintentar más tarde: se espera 20, 40 y 80 s.
ESPERAS_503 = (20, 40, 80)


def con_reintentos(llamada):
    """Hace la consulta tomando turno, y la reintenta si Gemini está saturado (503)."""
    for espera in (*ESPERAS_503, None):
        tomar_turno()
        try:
            return llamada()
        except ServerError as error:
            if error.code != 503 or espera is None:
                raise
            time.sleep(espera)


class JuezConTurno(GeminiModel):
    """El modelo juez de DeepEval: toma turno en el presupuesto y reintenta si Gemini está saturado."""

    def generate(self, *args, **kwargs):
        return con_reintentos(lambda: super(JuezConTurno, self).generate(*args, **kwargs))

    async def a_generate(self, *args, **kwargs):
        # Las métricas corren con async desactivado; si alguna usa la versión asíncrona, va en serie igual.
        return con_reintentos(lambda: super(JuezConTurno, self).generate(*args, **kwargs))


def pytest_collection_modifyitems(config, items):
    """Sin la clave de Gemini, todo se salta con aviso (no falla)."""
    if not CLAVE:
        saltar = pytest.mark.skip(reason="Falta GOOGLE_GENERATIVE_AI_API_KEY en pruebas/.env")
        for item in items:
            item.add_marker(saltar)


@pytest.fixture(scope="session")
def juez():
    """El modelo que juzga los resúmenes, con temperatura 0 para que sea lo más estable posible."""
    return JuezConTurno(model=MODELO_JUEZ, api_key=CLAVE, temperature=0)


@pytest.fixture(scope="session")
def moodle():
    """Datos de pruebas/seed/ia.php: contexto del curso, token y modelo que resume."""
    return json.loads(os.environ["MOODLE_IA"])


@pytest.fixture(scope="session")
def resumir(moodle):
    """Pide a Moodle el resumen de un texto, como lo hace el botón «Resumir» del curso."""

    def pedir(texto: str) -> dict:
        tomar_turno()  # Moodle hace una consulta a Gemini por resumen.
        respuesta = requests.post(
            f"{MOODLE_URL}/webservice/rest/server.php",
            data={
                "wstoken": moodle["token"],
                "wsfunction": "aiplacement_courseassist_summarise_text",
                "moodlewsrestformat": "json",
                "contextid": moodle["contexto"],
                "prompttext": texto,
            },
            timeout=120,
        )
        respuesta.raise_for_status()
        return respuesta.json()

    def resumir_texto(texto: str) -> str:
        for espera in (*ESPERAS_503, None):
            cuerpo = pedir(texto)
            saturado = "high demand" in str(cuerpo.get("errormessage") or "").lower()
            if not saturado or espera is None:
                break
            time.sleep(espera)
        assert "exception" not in cuerpo, f"Moodle respondió con un error: {cuerpo}"
        error = str(cuerpo.get("errormessage") or "")
        if not cuerpo["success"] and "high demand" in error.lower():
            pytest.skip(f"Gemini saturado (503) para el resumen de Moodle: {error[:200]}")
        if not cuerpo["success"] and ("quota" in error.lower() or str(cuerpo.get("errorcode")) == "429"):
            # Cupo gratuito agotado: no dice nada de la calidad del resumen, así que se salta.
            pytest.skip(f"Cupo de Gemini agotado para el resumen de Moodle ({error[:200]})")
        assert cuerpo["success"], f"El proveedor de IA falló: {error or cuerpo}"
        return cuerpo["generatedcontent"]

    return resumir_texto


@pytest.fixture
def registrar():
    """Guarda el resultado de un caso para el reporte (resultados.json y resumen.md)."""

    def guardar(resultado: dict) -> None:
        RESULTADOS.append(resultado)

    return guardar


def pytest_sessionfinish(session, exitstatus):
    """Escribe el reporte con el resumen de cada texto y la nota y la razón de cada métrica."""
    if not RESULTADOS:
        return
    REPORTES.mkdir(parents=True, exist_ok=True)
    (REPORTES / "resultados.json").write_text(json.dumps(RESULTADOS, ensure_ascii=False, indent=2), encoding="utf-8")

    lineas = [
        "# Evaluación del resumen con IA de Moodle (DeepEval)",
        "",
        f"Resume: Moodle con Gemini ({RESULTADOS[0]['modelo_resumen']}). Juzga: {MODELO_JUEZ}.",
        "",
        "| Caso | Tema | Métrica | Nota | Umbral | Pasa |",
        "|---|---|---|---|---|---|",
    ]
    for r in RESULTADOS:
        for m in r["metricas"]:
            lineas.append(f"| {r['caso']} | {r['tema']} | {m['nombre']} | {m['nota']:.2f} | {m['umbral']} | "
                          f"{'sí' if m['pasa'] else 'no'} |")
    lineas.append("")
    for r in RESULTADOS:
        lineas += [f"## {r['caso']} · {r['tema']}", "", "**Resumen de Moodle:**", "", f"> {r['resumen']}", ""]
        for m in r["metricas"]:
            lineas.append(f"- **{m['nombre']}** ({m['nota']:.2f}): {m['razon']}")
        lineas.append("")
    (REPORTES / "resumen.md").write_text("\n".join(lineas), encoding="utf-8")
