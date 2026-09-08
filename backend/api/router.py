import asyncio

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session
import httpx
from slowapi import Limiter
from slowapi.util import get_remote_address

from backend.db.database import SessionLocal
from backend.db import models
from backend.api import schemas
from backend.core.logger import logger
# 1. Importamos nuestro servicio de sincronización
from backend.services.asteroid_service import sync_asteroids_for_date

router = APIRouter(prefix="/api/asteroids", tags=["Asteroides"])

# Inicializamos el limitador de peticiones por IP
limiter = Limiter(key_func=get_remote_address)

# Límite de peticiones del endpoint (por IP)
ASTEROIDS_RATE_LIMIT: str = "30/minute"


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _query_asteroids_by_date(db: Session, date: str) -> list[models.Asteroide]:
    """Lectura síncrona de la caché local; se ejecuta en un hilo del pool."""
    return (db.query(models.Asteroide)
            .filter(models.Asteroide.close_approach_date == date)
            .all())


@router.get("/", response_model=list[schemas.AsteroideResponse])
@limiter.limit(ASTEROIDS_RATE_LIMIT)  # Límite: 30 peticiones por minuto por usuario
# <-- 2. Convertimos a async def
async def get_asteroids_by_date(
    request: Request,  # Requerido por slowapi
    date: str = Query(..., pattern=r"^\d{4}-\d{2}-\d{2}$",
                      description="Fecha en formato YYYY-MM-DD"),
    db: Session = Depends(get_db)
):
    """
    Devuelve la lista de asteroides registrados para una fecha específica.
    Si la base de datos local está vacía, consulta la NASA NeoWs API.
    """
    safe_date = date.replace("\n", "").replace("\r", "")[:10]
    logger.info(
        f"Petición GET recibida: Buscando asteroides para la fecha {safe_date}")

    try:
        # SQLite es síncrono: se delega a un hilo para no bloquear el event loop
        asteroides = await asyncio.to_thread(
            _query_asteroids_by_date, db, safe_date)

        if not asteroides:
            logger.info(
                f"Datos no encontrados en SQLite para {safe_date}. Descargando...")
            await sync_asteroids_for_date(safe_date, db)
            asteroides = await asyncio.to_thread(
                _query_asteroids_by_date, db, safe_date)

        return asteroides

    # Manejo Granular de Errores de la NASA
    except httpx.HTTPStatusError as e:
        status = e.response.status_code
        if status == 429:
            raise HTTPException(
                status_code=503, detail="Límite de la NASA API alcanzado. Intente más tarde.")
        elif status == 403:
            raise HTTPException(
                status_code=503, detail="API key de NASA inválida o expirada.")
        else:
            logger.error(f"NASA API error HTTP {status}")
            raise HTTPException(
                status_code=502, detail="Error al comunicarse con la NASA API.")
    except httpx.RequestError as e:
        logger.error(f"Error de red conectando con NASA: {e}")
        raise HTTPException(
            status_code=504, detail="Timeout conectando con la NASA API.")
    except ValueError as e:
        # Parámetros de fecha inválidos según la regla de negocio (rango > 7 días, etc.)
        logger.warning(f"Solicitud rechazada por validación: {e}")
        raise HTTPException(status_code=422, detail=str(e)) from e
    except Exception as e:
        logger.error(f"Error interno inesperado: {e}", exc_info=True)
        raise HTTPException(
            status_code=500, detail="Error interno del servidor.")
