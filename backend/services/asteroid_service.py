import asyncio

from sqlalchemy.dialects.sqlite import insert as sqlite_insert
from sqlalchemy.orm import Session

from backend.core.logger import logger
from backend.db import models
from backend.services.nasa_client import nasa_client

# Tope defensivo de objetos a insertar por sincronización (la NASA devuelve una
# lista por día; este cap evita un crecimiento descontrolado ante respuestas raras)
MAX_ASTEROIDS_PER_SYNC: int = 2000


def _persist_asteroids_for_date(data: dict, date: str, db: Session) -> int:
    """Procesa y almacena en SQLite los datos crudos ya descargados de la NASA.

    Función síncrona (realiza E/S de base de datos bloqueante): debe ejecutarse
    fuera del event loop mediante asyncio.to_thread.

    Args:
        data (dict): Respuesta JSON completa del feed de la NASA.
        date (str): Fecha en formato YYYY-MM-DD a la que pertenecen los datos.
        db (Session): Sesión activa de SQLAlchemy.

    Returns:
        int: Número de asteroides nuevos insertados en la base de datos.
    """

    asteroides_crudos = data.get("near_earth_objects", {}).get(date, [])

    if len(asteroides_crudos) > MAX_ASTEROIDS_PER_SYNC:
        logger.warning(
            f"Truncando asteroides: {len(asteroides_crudos)} "
            f"> {MAX_ASTEROIDS_PER_SYNC}")
        asteroides_crudos = asteroides_crudos[:MAX_ASTEROIDS_PER_SYNC]

    if not asteroides_crudos:
        logger.warning(f"La NASA no devolvió asteroides para la fecha {date}.")
        return 0

    # 1. Consultar IDs existentes para evitar duplicados (Optimización de DB)
    ids_existentes = {
        row[0] for row in db.query(models.Asteroide.id)
        .filter(models.Asteroide.close_approach_date == date)
        .all()
    }
    nuevos_asteroides = []
    # 2. Procesar y mapear cada asteroide
    for ast in asteroides_crudos:
        ast_id = None
        try:
            # Navegación del JSON y casteo estricto de tipos. 'id' se lee dentro
            # del try: un registro sin id se trata como malformado y se omite.
            ast_id = ast["id"]

            if ast_id in ids_existentes:
                continue

            diametro = ast["estimated_diameter"]["kilometers"]["estimated_diameter_max"]
            peligroso = ast["is_potentially_hazardous_asteroid"]

            close_approach_data = ast["close_approach_data"][0]
            velocidad = float(
                close_approach_data["relative_velocity"]["kilometers_per_hour"])
            distancia = float(
                close_approach_data["miss_distance"]["kilometers"])

            # Instanciamos el modelo ORM
            nuevo_asteroide = models.Asteroide(
                id=ast_id,
                name=ast["name"],
                close_approach_date=date,
                estimated_diameter_max_km=diametro,
                is_potentially_hazardous=peligroso,
                relative_velocity_km_h=velocidad,
                miss_distance_km=distancia
            )

            nuevos_asteroides.append(nuevo_asteroide)

        except (KeyError, ValueError, IndexError) as e:
            logger.error(f"Error parseando el asteroide {ast_id}: {e}")
            continue

    # 3. Inserción en la base de datos con protección de conflictos (Race Condition)
    if nuevos_asteroides:

        # Converitmos los objetos ORM a diccionarios
        valores = [
            {
                "id": ast.id,
                "name": ast.name,
                "close_approach_date": ast.close_approach_date,
                "estimated_diameter_max_km": ast.estimated_diameter_max_km,
                "is_potentially_hazardous": ast.is_potentially_hazardous,
                "relative_velocity_km_h": ast.relative_velocity_km_h,
                "miss_distance_km": ast.miss_distance_km
            }
            for ast in nuevos_asteroides
        ]

        # INSERT OR IGNORE de SQLite: Si el ID ya exisiste, lo ignora silenciosamente
        stmt = sqlite_insert(models.Asteroide.__table__).values(valores)
        stmt = stmt.on_conflict_do_nothing(index_elements=["id"])
        db.execute(stmt)
        db.commit()

        logger.info(
            f"Sincronización completa: {len(nuevos_asteroides)} asteroides procesados.")
    else:
        logger.info(
            "Sincronización completa: Todos los asteroides ya estaban en la base de datos.")

    return len(nuevos_asteroides)


async def sync_asteroids_for_date(date: str, db: Session) -> int:
    """Descarga y persiste los asteroides de una fecha sin bloquear el event loop.

    La descarga a la NASA es async (I/O de red) y se ejecuta en el event loop;
    la persistencia en SQLite es síncrona y se delega a un hilo con
    asyncio.to_thread para no bloquear las peticiones concurrentes.

    Args:
        date (str): Fecha en formato YYYY-MM-DD para sincronizar asteroides.
        db (Session): Sesión activa de SQLAlchemy.

    Raises:
        Exception: Si ocurre un error al obtener datos de la NASA.

    Returns:
        int: Número de asteroides nuevos insertados en la base de datos.
    """
    logger.info(
        f"Iniciando sincronización de asteroides para la fecha {date}...")

    # 1. Obtenemos datos de la NASA (I/O de red, async)
    try:
        data = await nasa_client.fetch_asteroids(date, date)
    except Exception:
        logger.error(f"Fallo al obtener datos de la NASA para fecha {date}.")
        raise

    # 2. La persistencia en SQLite es síncrona: se ejecuta en un hilo del pool
    return await asyncio.to_thread(_persist_asteroids_for_date, data, date, db)
