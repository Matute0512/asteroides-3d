# 🚀 Asteroides 3D - NASA Tracker

Una aplicación web Full-Stack interactiva que permite visualizar en 3D los Asteroides Cercanos a la Tierra (NEOs) utilizando datos reales y oficiales de la **NASA NeoWs API**.

## 🌌 Características Principales
* **Tubería de Datos Real:** Integración asíncrona con la API de la NASA.
* **Patrón Cache-Aside:** Almacenamiento inteligente en base de datos local (SQLite) para optimizar las peticiones, evitar bloqueos de la API y acelerar los tiempos de respuesta.
* **Motor 3D Nativo:** Renderizado del sistema espacial a 60 FPS utilizando **Three.js** y WebGL.
* **Interactividad (Raycasting):** Selección de asteroides en pantalla mediante proyección de rayos láser invisibles para desplegar telemetría exacta (velocidad, tamaño, peligro de impacto).
* **Escala Matemática:** Algoritmos de conversión de escala para representar distancias astronómicas reales en un entorno visualmente estético.

## 🛠️ Stack Tecnológico
**Backend:**
* Python 3.12+
* FastAPI (API REST asíncrona y CORS)
* SQLAlchemy (ORM) & SQLite
* Pydantic V2 (Validación de esquemas)
* HTTPX (Peticiones asíncronas)

**Frontend:**
* Vanilla JavaScript (ES6 Modules)
* Three.js (WebGL 3D Engine)
* HTML5 & CSS3 (Diseño Glassmorphism)

## ⚙️ Instalación y Ejecución Local

### 1. Configurar el Backend (Python)
1. Clona este repositorio.
2. Crea un entorno virtual: `python -m venv venv`
3. Activa el entorno:
   * Windows: `venv\Scripts\activate`
   * Mac/Linux: `source venv/bin/activate`
4. Instala las dependencias: `pip install -r requirements.txt`
5. Crea un archivo `.env` en la raíz con tu API Key de la NASA: `NASA_API_KEY=tu_clave_aqui`
6. Inicia el servidor local: `uvicorn backend.main:app --reload` (Correrá en el puerto 8000).

### 2. Configurar el Frontend
1. Abre la carpeta raíz del proyecto en Visual Studio Code.
2. Instala la extensión **Live Server**.
3. Haz clic derecho sobre el archivo `frontend/index.html` y selecciona **"Open with Live Server"**.
4. ¡Explora el universo en el puerto 5500!

## 👨‍💻 Arquitectura y Buenas Prácticas
Este proyecto fue construido aplicando principios de **Responsabilidad Única (SRP)**, **Programación Orientada a Objetos (POO)** en el frontend, **Inyección de Dependencias** en el backend y **Commits Atómicos** (Convención `feat`, `fix`, `docs`).