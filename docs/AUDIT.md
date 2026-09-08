# Auditoría Consolidada — ateroides_app

> **Fecha:** 2026-09-07 · **Estado:** Completada y cerrada · **Rama:** `main` (working tree limpio)
> Auditoría en dos fases estrictas (backend → frontend) con correcciones commiteadas de forma atómica y una prueba de integración total de punta a punta.

## Resumen

| Fase | Alcance | Resultado |
|---|---|---|
| 1 | Backend (FastAPI + SQLite + NASA NeoWs) | Hallazgos N1–N7 corregidos (N6 como deuda documentada). Tests 7/7, ruff limpio. |
| 2 | Frontend (Three.js / Vanilla JS) | Hallazgos F1–F7 resueltos. Verificación headless sin errores ni 404. |
| Integración | UI → ApiClient → FastAPI → NASA → SQLite → WebGL | Flujo completo operativo de punta a punta. |

---

## 1. Fase 1 — Backend

### Hallazgos corregidos
| # | Hallazgo | Solución | Commit |
|---|---|---|---|
| N1 | Regla ≤7 días no validada (solo docstring) | `fetch_asteroids` valida formato/rango y el router traduce a HTTP 422 | `ec5d866` |
| N2 | SQL síncrona en handlers async bloqueaba el event loop | `asyncio.to_thread`: lecturas del router + persistencia del service en hilo | `ecb15de` |
| N3 | Índices redundantes (PK `id` + `close_approach_date` duplicados) | Solo índice compuesto `(close_approach_date, id)` | `e745af4` |
| N4 | Valores mágicos dispersos | Constantes con nombre en `nasa_client`, `router`, `logger`, `asteroid_service` | `a9365b7` |
| N5 | Registro sin `id` provocaba `IntegrityError` no capturado | `id` se lee dentro del `try/except` (se omite si es malformado) | `01fe773` |
| N7 | `load_dotenv()` dependía del CWD | Ruta explícita a la raíz del proyecto | `6ee07e0` |

### Deuda técnica (despliegue)
| Hallazgo | Detalle | Referencia |
|---|---|---|
| N6 | `slowapi` con `get_remote_address` detrás del proxy de Render ve la IP del proxy → límite `30/minute` global | `TECH_DEBT.md` |
| N3 residual | Índices antiguos persisten en DBs SQLite ya creadas (hasta migrar/regenerar) | `TECH_DEBT.md` |

### Verificación Fase 1
- `pytest`: **7 passed** (4 originales + 3 de regresión del cliente NASA).
- `ruff check backend tests`: limpio.
- API key de NASA: en `.env` (git-ignorado), nunca en el historial; sin hardcodeos.

---

## 2. Fase 2 — Frontend

### Hallazgos resueltos
| # | Hallazgo | Solución | Commit |
|---|---|---|---|
| F5 | `SpaceScene` mezclaba WebGL + DOM | `ui.js` (presentación, todo DOM) · `scene3d.js` WebGL puro · `main.js` controlador | `396ff13` |
| F7 | Valores mágicos dispersos | `constants.js` centraliza radios, colores, divisores, texturas, mensajes | `396ff13` |
| — | Acumulación de asteroides al buscar otra fecha | `clearAsteroids()` antes de nuevos datos (y también con respuesta vacía) | `607642f`, `9bda55a` |
| F4 | CSS no responsivo (anchos fijos, `vh`, sin `@media`) | `dvh`, paneles fluidos `clamp()/flexbox`, bottom-sheets <640px con `:has` | `a799071` |
| F1 | Sin skybox 360°; Tierra por CDN | Skybox `CubeTextureLoader` (procedural si no hay archivos); Tierra con `setSurfaceTexture/setCloudTexture` | `9bda55a` |
| F3 | Escala sin proporción y colisiones con la Tierra | Radio terrestre como unidad base + `log10` normalizado + margen (Tierra + radio asteroide + gap) | `9bda55a` |
| F2 | Sin trayectorias ni animación independiente del FPS | Anillos orbitales (1 `LineSegments`) con el `safeDistance` de F3 + `THREE.Clock` | `70a577c` |
| F6 | Texturas desde CDN externo | Texturas locales bajo `frontend/assets/` con pre-chequeo `HEAD` (0 errores 404) y respaldo limpio | `2449555` |

### Verificación Fase 2
- `node --check` (ESM): OK en los 5 módulos.
- Invariante de colisión: **315 combinaciones** (diámetro × distancia × sliders) sin violar `distancia ≥ Tierra + radio asteroide + gap`; radio ≤ 0.6×Tierra.
- Headless (Edge + CDP): sin errores JS, sin 404 de recursos, FPS por píxel (software), layout sin overflow en 390 / 768 / 1280.

---

## 3. Prueba de Integración Total

### Pila levantada en paralelo
- Backend: `venv\Scripts\python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000`
- Frontend: `venv\Scripts\python -m http.server 5500 --directory frontend`

### Resultados
- Health `/` → HTTP 200.
- `/api/asteroids/?date=2026-08-20` 1ª llamada → HTTP 200 en **1.9 s** (NASA NeoWs → SQLite). 2ª llamada → **0.011 s** (cache-aside).
- UI simulada en headless (fijar fecha + clic en "Explorar"):
  ```
  [ApiClient] Solicitando ... 2026-09-08 → Datos recibidos: 4 asteroides   (boot)
  [ApiClient] Solicitando ... 2026-08-20 → Datos recibidos: 4 asteroides   (consulta)
  404 de recursos: 0   ·   errores JS: ninguno
  ```
- Escena limpia: overlay oculto, sin mensajes de error, canvas a tamaño de viewport, sin overflow horizontal.

**Flujo completo confirmado:** UI → ApiClient → FastAPI → NASA NeoWs API → SQLite → render WebGL 3D (Skybox 360°, Tierra, órbitas, asteroides animados).

---

## 4. Cómo ejecutar

```bash
# Backend
venv\Scripts\python -m uvicorn backend.main:app --port 8000
# Frontend (en otra terminal)
venv\Scripts\python -m http.server 5500 --directory frontend
# Abrir http://127.0.0.1:5500
```

## 5. Pendientes (no bloqueantes)
- **N6** y residuo de índices N3 → etapa de despliegue (`TECH_DEBT.md`).
- Activar assets reales cuando se tengan: `frontend/assets/skybox/{px,nx,py,ny,pz,nz}.jpg` y `frontend/assets/textures/earth_day.jpg` (+ `earth_clouds.png`) — sin tocar código.
- Opcional futuro: migraciones Alembic, tests de frontend, integrar assets reales, instalar texturas de nubes.

---

*Informe generado como cierre de la auditoría. Commits atómicos en `main`; cada commit es un cambio lógico e independiente.*
