# language: es
#
# Cada escenario implementa el caso de caja negra que lleva en el nombre (MOOD-CP-NNN) y parte del
# estado que le deja pruebas/seed/preparar.php. La clave del curso sembrado es Clave-2026.
@rf-01
Característica: RF-MOOD-01 · Automatricularse con clave
  Para ver los contenidos del curso de laboratorio
  como estudiante que todavía no está matriculado
  quiero matricularme yo mismo con la clave que me dio el docente

  Regla: solo se matricula quien escribe la clave exacta y mientras haya cupo

    Escenario: MOOD-CP-101 - Con la clave del curso queda matriculado
      Dado que Bruno inició sesión
      Cuando él se matricula en el curso con la clave "Clave-2026"
      Entonces él entra al curso "Laboratorio de pruebas de software"

    Esquema del escenario: <caso> - Una clave que no es la del curso no lo matricula (<cual>)
      Dado que Bruno inició sesión
      Cuando él se matricula en el curso con la clave "<clave>"
      Entonces él ve el error "Incorrect enrolment key, please try again"
      Y él sigue sin matricularse

      Ejemplos:
        | caso        | cual                 | clave      |
        | MOOD-CP-102 | otra clave           | Clave-2025 |
        | MOOD-CP-103 | vacía                |            |
        | MOOD-CP-104 | con otras mayúsculas | clave-2026 |

    Escenario: MOOD-CP-115 - Con el cupo lleno no se ofrece la matrícula
      Dado que Bruno inició sesión
      Cuando él abre la matriculación del curso
      Entonces él ve el aviso "Maximum number of users allowed to self-enrol was already reached."
      Y él no puede matricularse
