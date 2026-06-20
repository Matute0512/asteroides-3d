from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.db.database import SessionLocal
from backend.db import models
from backend.api import schemas
from backend.core.logger import logger
# 1. Importamos nuestro servicio de sincronización
from backend.services.asteroid_service import sync_asteroids_for_date

router = APIRouter(prefix="/api/asteroids", tags=["Asteroides"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.get("/", response_model=list[schemas.AsteroideResponse])
# <-- 2. Convertimos a async def
async def get_asteroids_by_date(date: str, db: Session = Depends(get_db)):
    """
    Devuelve la lista de asteroides registrados para una fecha específica.
    Si la base de datos local está vacía, consulta la NASA NeoWs API.
    """
    logger.info(
        f"Petición GET recibida: Buscando asteroides para la fecha {date}")

    try:
        # Paso 1: Intentar obtener los datos de la caché local (SQLite)
        asteroides = db.query(models.Asteroide).filter(
            models.Asteroide.close_approach_date == date).all()

        # Paso 2: Si no hay datos, llamar al servicio de la NASA
        if not asteroides:
            logger.info(
                f"Datos no encontrados en SQLite para {date}. Iniciando descarga desde la NASA...")

            # Sincronizamos (esto pausará la ejecución hasta que la NASA responda)
            nuevos_insertados = await sync_asteroids_for_date(date, db)

            if nuevos_insertados > 0:
                # Volvemos a consultar SQLite para extraer los objetos con el formato ORM correcto
                asteroides = db.query(models.Asteroide).filter(
                    models.Asteroide.close_approach_date == date).all()
            else:
                logger.warning(
                    f"La NASA no retornó asteroides válidos para {date}.")
        else:
            # Paso 3: Retornar los datos locales inmediatamente
            logger.info(
                f"Servido desde caché local: {len(asteroides)} asteroides encontrados para {date}.")

        return asteroides

    except Exception as e:
        logger.error(
            f"Fallo crítico al procesar la solicitud de asteroides: {e}")
        raise HTTPException(
            status_code=500, detail="Error interno del servidor al procesar los asteroides.")
