from sqlalchemy.orm import Session
from sqlalchemy.dialects.sqlite import insert as sqlite_insert
from backend.db import models
from backend.services.nasa_client import nasa_client
from backend.core.logger import logger


async def sync_asteroids_for_date(date: str, db: Session) -> int:
    """Descarga, procesa y almacena los asteroides de una fecha especifica.


    Args:
        date (str): Fecha en formato YYYY-MM-DD para sincronizar asteroides.
        db (Session): Sesión activa de SQLAlchemy para interactuar con la base de datos.

    Raises:
        Exception: Si ocurre un error al obtener datos de la NASA.
        KeyError: Si faltan claves esperadas en la estructura JSON.
        ValueError: Si algún valor no puede convertirse al tipo esperado.
        IndexError: Si la lista de datos de aproximación está vacía o mal formada.

    Returns:
        int: Número de asteroides nuevos insertados en la base de datos.
    """
    logger.info(
        f"Iniciando sincronización de asteroides para la fecha {date}...")

    # 1. Obtenemos datos de la NASA
    try:
        data = await nasa_client.fetch_asteroids(date, date)
    except Exception as e:
        logger.error(f"Fallo al obtener datos de la NASA para fecha {date}.")
        raise e

    # Extraemos la lista de asteroides para la fecha solicitada
    asteroides_crudos = data.get("near_earth_objects", {}).get(date, [])
    if not asteroides_crudos:
        logger.warning(f"La NASA no devolvió asteroides para la fecha {date}.")
        return 0

    # 2. Consultar IDs existentes para evitar duplicados (Optimización de DB)
    ids_existentes = {
        row[0] for row in db.query(models.Asteroide.id)
        .filter(models.Asteroide.close_approach_date == date)
        .all()
    }
    nuevos_asteroides = []
    # 3. Procesar y mapear cada asteroide
    for ast in asteroides_crudos:
        ast_id = ast.get("id")

        if ast_id in ids_existentes:
            continue

        try:
            # Navegación del JSON y casteo estricto de tipos
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

    # 4. Inserción en la base de datos con protección de conflictos (Race Condition)
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
        stm = sqlite_insert(models.Asteroide).values(
            valores).on_conflict_do_nothing(index_elements=["id"])
        db.execute(stm)
        db.commit()

        logger.info(
            f"Sincronización completa: {len(nuevos_asteroides)} asteroides procesados.")
    else:
        logger.info(
            "Sincronización completa: Todos los asteroides ya estaban en la base de datos.")

    return len(nuevos_asteroides)
