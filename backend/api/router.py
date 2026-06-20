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


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.get("/", response_model=list[schemas.AsteroideResponse])
@limiter.limit("30/minute")  # Límite: 30 peticiones por minuto por usuario
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
        asteroides = db.query(models.Asteroide).filter(
            models.Asteroide.close_approach_date == safe_date).all()

        if not asteroides:
            logger.info(
                f"Datos no encontrados en SQLite para {safe_date}. Descargando...")
            await sync_asteroids_for_date(safe_date, db)
            asteroides = db.query(models.Asteroide).filter(
                models.Asteroide.close_approach_date == safe_date).all()

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
    except Exception as e:
        logger.error(f"Error interno inesperado: {e}", exc_info=True)
        raise HTTPException(
            status_code=500, detail="Error interno del servidor.")
