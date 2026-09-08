from datetime import datetime

import httpx

from backend.core.config import settings
from backend.core.logger import logger

# Configuración de timeouts del cliente HTTP
CONNECT_TIMEOUT_S: float = 5.0
READ_TIMEOUT_S: float = 30.0
WRITE_TIMEOUT_S: float = 5.0
POOL_TIMEOUT_S: float = 5.0

# Restricciones de la NASA NeoWs API
DATE_FORMAT: str = "%Y-%m-%d"
MAX_DATE_RANGE_DAYS: int = 7


class NasaApiClient:
    """Cliente dedicado para interactuar con la NASA NeoWs API usando una sesión persistente"""

    def __init__(self) -> None:
        # Configuración centralizada
        self.base_url = settings.NASA_BASE_URL
        self.api_key = settings.NASA_API_KEY

        # Instanciamos un único cliente asíncrono persistente con timeout global
        self.client = httpx.AsyncClient(
            timeout=httpx.Timeout(
                connect=CONNECT_TIMEOUT_S,
                read=READ_TIMEOUT_S,
                write=WRITE_TIMEOUT_S,
                pool=POOL_TIMEOUT_S,
            ),
        )

    async def fetch_asteroids(self, start_date: str, end_date: str) -> dict:
        """
        Obtiene los asteroides cercanos a la Tierra en un rango de fechas.
        Máximo 7 dias de diferencia permitidos por la API.
        """
        # Regla de negocio: la NASA solo permite rangos de hasta 7 días.
        # Se valida explícitamente aquí (no solo por el flujo de una sola fecha).
        try:
            start = datetime.strptime(start_date, DATE_FORMAT).date()
            end = datetime.strptime(end_date, DATE_FORMAT).date()
        except ValueError as exc:
            raise ValueError(
                f"Las fechas deben usar el formato {DATE_FORMAT}.") from exc

        if end < start:
            raise ValueError("start_date no puede ser posterior a end_date.")

        if (end - start).days > MAX_DATE_RANGE_DAYS:
            raise ValueError(
                f"El rango de fechas no puede exceder {MAX_DATE_RANGE_DAYS} días "
                f"(solicitado: {(end - start).days}).")

        endpoint = f"{self.base_url}/feed"
        params = {
            "start_date": start_date,
            "end_date": end_date,
            "api_key": self.api_key
        }

        logger.info(
            f"Consultando NASA API: asteroides desde {start_date} hasta {end_date}...")

        try:
            # Reutilizamos el cliente persistente
            response = await self.client.get(endpoint, params=params)
            response.raise_for_status()

            logger.info("Datos descargados exitosamente desde la NASA.")
            return response.json()

        except httpx.HTTPStatusError as e:
            logger.error(
                f"Error HTTP de la Nasa ({e.response.status_code}): {e.response.text}")
            raise e
        except httpx.RequestError as e:
            logger.critical(
                f"Fallo de red al intentar conectar con la NASA: {e}")
            raise e

    async def close(self) -> None:
        """Cierra el cliente HTTP  persistente para liberar recursos de red.
        """
        await self.client.aclose()
        logger.info("Cliente HTTP de la NASA cerrado correctamente.")


# Instanciamos el cliente global
nasa_client = NasaApiClient()
