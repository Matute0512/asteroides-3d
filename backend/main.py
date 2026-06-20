import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from backend.api.router import limiter
from backend.core.logger import logger
from backend.db.database import engine, Base
from backend.db import models
from backend.services.nasa_client import nasa_client
from backend.api.router import router as asteroides_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # --- Lógica de Encendido (Startup) ---
    try:
        logger.info("Iniciando servidor FastAPI...")
        Base.metadata.create_all(bind=engine)
        logger.info("Tablas de la base de datos sincronizadas exitosamente.")
        yield
    except Exception as e:
        logger.critical(f"Fallo crítico al inicializar la base de datos: {e}")
        raise e
    finally:
        # --- Lógica de Apagado (Shutdown) ---
        logger.info("Apagando el servidor y liberando recursos.")
        await nasa_client.close()

# Instanciamos la aplicación FastAPI inyectando nuestro lifespan
app = FastAPI(
    title="Asteroides 3D API",
    description="API puente para procesar y servir datos de la NASA NeoWS",
    version="1.0.0",
    lifespan=lifespan
)

app.state.limiter = limiter
app.add_exception_handler(
    RateLimitExceeded, _rate_limit_exceeded_handler)  # type:ignore
# Leer orígenes desde el entorno, con fallback a localhost para desarrollo
origins_str = os.getenv(
    "ALLOWED_ORIGINS", "http://127.0.0.1:5500,http://localhost:5500")
origins = [o.strip() for o in origins_str.split(",")]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET"],
    allow_headers=["*"]
)


# Conectamos el enrutador a la aplicación principal
app.include_router(asteroides_router)


# Endpoint raíz de comprobación de salud (Health Check)
@app.get("/")
def health_check():
    return {"estado": "ok", "mensaje": "API de Asteroides 3D operativa."}
