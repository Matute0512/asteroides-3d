import logging
import sys


def _setup_logger() -> logging.Logger:
    logger = logging.getLogger("AsteroidesApp")
    logger.setLevel(logging.INFO)

    # Evitar duplicación de handlers si se importa múltiples veces
    if not logger.handlers:
        # Definir el formato de salida
        formatter = logging.Formatter(
            fmt="[%(asctime)s] %(levelname)-8s | %(module)s.py | %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S"
        )

        # Configurar la salida a la consola
        console_handler = logging.StreamHandler(sys.stdout)
        console_handler.setFormatter(formatter)

        # acoplar el handler al logger
        logger.addHandler(console_handler)

        try:
            file_handler = logging.FileHandler(
                "app.log", mode="a", encoding="utf-8")
            file_handler.setFormatter(formatter)
            logger.addHandler(file_handler)
        except OSError as error:
            logger.warning(
                f"No se pudo inicializar la persistencia de logs en 'app.log': {error}")

    return logger


# Instancia global para ser importada desde otros módulos
logger = _setup_logger()
