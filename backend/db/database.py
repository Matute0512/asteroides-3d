from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from backend.core.config import settings
from backend.core.logger import logger

# 1. Crear el motor de la base de datos utilizando la configuración centralizada
engine = create_engine(
    settings.DATABASE_URL,
    # Requerido por SQLite para multihilo
    connect_args={"check_same_thread": False}
)

# 2. Configurar la fábrica de sesiones (control transaccional manual)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# 3. Instanciar la clase base para la herencia de los futuros modelos ORM
Base = declarative_base()

# 4. Forzar una conexión de prueba para validar accesos al archivo en el disco
try:
    with engine.connect() as connection:
        logger.info(
            f"Conexión exitosa a la base de datos en: {settings.DATABASE_URL}"
        )
except Exception as e:
    # Captura explícita de fallos de ruta o permisos antes de detener el sistema
    logger.critical(f"Error crítico al conectar con la base de datos: {e}")
    raise e
