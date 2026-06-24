# Capa 1: imagen base — Python 3.12 versión mínima (slim = sin extras innecesarios)
FROM python:3.12-slim

# Instalar curl para el health check
RUN apt-get update && apt-get install -y --no-install-recommends curl && \
    rm -rf /var/lib/apt/lists/*

# Capa 2: usuario no-root por seguridad
# Por defecto Docker corre como root — si alguien hackea el contenedor, tiene acceso total
# Con un usuario propio, el daño queda contenido
RUN addgroup --system appgroup && adduser --system --group appuser

# Capa 3: directorio de trabajo dentro del contenedor
WORKDIR /app

# Capa 4: copiamos SOLO el requirements.txt primero
# ¿Por qué? Si copiamos todo el código junto, cualquier cambio en el código
# invalida el cache de pip y reinstala todo. Así pip solo se re-ejecuta
# cuando cambia requirements.txt
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Capa 5: ahora sí copiamos el código
COPY backend/ ./backend/
COPY frontend/ ./frontend/

# Capa 6: crear directorios de datos y logs, asignar permisos al usuario
RUN mkdir -p /app/data /app/logs && \
    chown -R appuser:appgroup /app
USER appuser
# Variables que mejoran el comportamiento de Python en contenedores
# PYTHONUNBUFFERED: los logs aparecen en tiempo real, no en buffer
# PYTHONDONTWRITEBYTECODE: no genera archivos .pyc innecesarios
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

# Puerto que expone el contenedor (documentación, no abre el puerto solo)
EXPOSE 8000

# Comando de arranque — gunicorn con workers de uvicorn
# --workers 2: dos procesos paralelos
# --worker-class: cada worker es async (uvicorn)
# --bind: escucha en todas las interfaces del contenedor
# --timeout 60: espera hasta 60s por request (NASA puede tardar)
CMD ["gunicorn", "backend.main:app", \
     "--workers", "2", \
     "--worker-class", "uvicorn.workers.UvicornWorker", \
     "--bind", "0.0.0.0:8000", \
     "--timeout", "60", \
     "--access-logfile", "-"]