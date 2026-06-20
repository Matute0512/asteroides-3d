import os
from dotenv import load_dotenv
from backend.core.logger import logger
# 1. Cargar las variables del archivo .env al entorno de Python
load_dotenv()


class Settings():
    """Clase central para manejar la configuración y credenciales de la App.
    """

    # URL Base limpia de la API NeoWs (Permite modularidad para usar Feed, Lookup o Browse)
    NASA_BASE_URL: str = "https://api.nasa.gov/neo/rest/v1"
    DATABASE_URL: str = "sqlite:///./asteroides.db"

    def __init__(self) -> None:
        # 2. Leer la API key desde las variables de entorno
        self.NASA_API_KEY = os.getenv("NASA_API_KEY")

        if not self.NASA_API_KEY:
            logger.critical("No se encontró NASA_API_KEY en el entorno.")
            raise ValueError(
                "ERROR CRÍTICO: La variable NASA_API_KEY no esta definida.")

        # En desarrollo: http://127.0.0.1:5500,http://localhost:5500
        # En producción definir en .env: ALLOWED_ORIGINS=https://tu-dominio.com
        origins_raw = os.getenv(
            "ALLOWED_ORIGINS",
            "http://127.0.0.1:5500,http://localhost:5500"
        )
        self.ALLOWED_ORIGINS: list[str] = [
            origin.strip() for origin in origins_raw.split(",") if origin.strip()
        ]

        logger.info("Configuración de entorno cargada exitosamente.")
        logger.info(f"CORS permitido para: {self.ALLOWED_ORIGINS}")


# 4. Instanciar la configuración para que otros módulos la importen directamente
settings = Settings()
