from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from sqlalchemy.exc import OperationalError
from uvicorn.middleware.proxy_headers import ProxyHeadersMiddleware

from backend.api.router import limiter
from backend.api.router import router as asteroides_router
from backend.core.config import settings
from backend.core.logger import logger
from backend.db.database import Base, engine
from backend.services.nasa_client import nasa_client


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        logger.info("Iniciando servidor FastAPI...")
        Base.metadata.create_all(bind=engine, checkfirst=True)
        logger.info("Tablas de la base de datos sincronizadas exitosamente.")
    except OperationalError as e:
        if "already exists" in str(e):
            logger.info("Tablas ya existentes, continuando...")
        else:
            logger.critical(
                f"Fallo crítico al inicializar la base de datos: {e}")
            raise
    yield
    logger.info("Apagando el servidor y liberando recursos.")
    await nasa_client.close()

# Instanciamos la aplicación FastAPI inyectando nuestro lifespan
app = FastAPI(
    title="Asteroides 3D API",
    description="API puente para procesar y servir datos de la NASA NeoWS",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(ProxyHeadersMiddleware, trusted_hosts=["*"])

app.state.limiter = limiter
app.add_exception_handler(
    RateLimitExceeded, _rate_limit_exceeded_handler)  # type:ignore
# Leer orígenes desde el entorno, con fallback a localhost para desarrollo


app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET"],
    allow_headers=["Content-Type", "Authorization"]
)


# Conectamos el enrutador a la aplicación principal
app.include_router(asteroides_router)


# Endpoint raíz de comprobación de salud (Health Check)
@app.get("/")
def health_check():
    return {"estado": "ok", "mensaje": "API de Asteroides 3D operativa."}
