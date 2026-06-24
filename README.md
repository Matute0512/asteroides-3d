# 🚀 Asteroides 3D - NASA Tracker

Una aplicación web Full-Stack interactiva que permite visualizar en 3D los Asteroides Cercanos a la Tierra (NEOs) utilizando datos reales y oficiales de la **NASA NeoWs API**.

## 🌌 Características Principales
* **Tubería de Datos Real:** Integración asíncrona con la API de la NASA.
* **Patrón Cache-Aside:** Almacenamiento inteligente en base de datos local (SQLite) para optimizar las peticiones, evitar bloqueos de la API y acelerar los tiempos de respuesta.
* **Motor 3D Nativo:** Renderizado del sistema espacial a 60 FPS utilizando **Three.js** y WebGL.
* **Interactividad (Raycasting):** Selección de asteroides en pantalla mediante proyección de rayos para desplegar telemetría exacta (velocidad, tamaño, peligro de impacto).
* **Escala Matemática:** Algoritmos de conversión de escala para representar distancias astronómicas reales en un entorno visualmente estético.

## 🛠️ Stack Tecnológico

**Backend:**
* Python 3.12+
* FastAPI (API REST asíncrona y CORS)
* SQLAlchemy (ORM) & SQLite
* Pydantic V2 (Validación de esquemas)
* HTTPX (Peticiones asíncronas)
* Gunicorn + Uvicorn Workers (Servidor de producción)
* SlowAPI (Rate limiting)

**Frontend:**
* Vanilla JavaScript (ES6 Modules)
* Three.js (WebGL 3D Engine)
* HTML5 & CSS3 (Diseño Glassmorphism)

**DevOps:**
* Docker & Docker Compose
* GitHub Actions (CI: lint + tests automáticos)

## ⚙️ Instalación y Ejecución Local

### Requisitos previos
* Python 3.12+
* API Key gratuita de la NASA: https://api.nasa.gov

### 1. Clonar el repositorio
```bash
git clone https://github.com/tu-usuario/asteroides-3d.git
cd asteroides-3d
```

### 2. Configurar el Backend
```bash
# Crear y activar entorno virtual
python -m venv venv

# Windows
venv\Scripts\activate
# Mac/Linux
source venv/bin/activate

# Instalar dependencias
pip install -r requirements.txt

# Crear archivo de configuración
cp .env.example .env
# Editar .env y agregar tu NASA_API_KEY
```

### 3. Iniciar el Backend
```bash
uvicorn backend.main:app --reload
# Disponible en http://127.0.0.1:8000
```

### 4. Iniciar el Frontend
```bash
# En otra terminal
python -m http.server 5500 --directory frontend
# Disponible en http://127.0.0.1:5500
```

## 🐳 Ejecución con Docker

```bash
# Copiar y configurar variables de entorno
cp .env.example .env
# Editar .env con tu NASA_API_KEY

# Construir y levantar todos los servicios
docker-compose up --build

# Backend disponible en http://localhost:8000
# Frontend disponible en http://localhost:5500
```

Para detener:
```bash
docker-compose down
```

## 🧪 Tests

```bash
pip install pytest pytest-asyncio ruff
pytest tests/ -v
```

## 👨‍💻 Arquitectura y Buenas Prácticas

Este proyecto fue construido aplicando:

* **Responsabilidad Única (SRP):** cada módulo tiene una sola razón para cambiar.
* **Patrón Cache-Aside:** la base de datos actúa como caché de la NASA API.
* **Inyección de Dependencias:** sesiones de base de datos inyectadas por FastAPI.
* **Rate Limiting:** protección contra abuso de la NASA API key.
* **Race Condition Prevention:** INSERT OR IGNORE para requests concurrentes.
* **Commits Atómicos:** convención Conventional Commits (`feat`, `fix`, `docs`).
* **CI/CD:** pipeline automático de lint y tests en cada push.