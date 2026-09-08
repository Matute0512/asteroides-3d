# Deuda Técnica

Registro de hallazgos pendientes que deben resolverse **antes o durante la etapa de despliegue / puesta en producción**. No bloquean el desarrollo local, pero afectan comportamiento o seguridad en producción.

---

## N6 — Rate-limit de SlowAPI detrás de un proxy (producción)

**Severidad:** Media · **Cuándo resolver:** Etapa de despliegue (Render/cloud).
**Ámbito:** `backend/api/router.py` — `limiter = Limiter(key_func=get_remote_address)`.

### Problema
`slowapi` identifica al cliente por `request.client.host`. Cuando la app corre detrás de un reverse proxy (Render, Nginx, etc.), **todas** las peticiones llegan con la IP del proxy, por lo que el límite `ASTEROIDS_RATE_LIMIT = "30/minute"` se vuelve **global para todos los usuarios**: un solo cliente puede agotar la cuota y dejar el endpoint temporalmente en 429 para el resto.

### Impacto
- 429 falsos en producción bajo carga normal.
- No se puede distinguir usuarios reales para el límite por IP.

### Solución propuesta (elegir una)
1. Confiar en la cabecera real del proxy:
   - En Render, asegurarse de que el proxy inyecta `X-Forwarded-For` de forma fiable y usar una key_func que la lea (p. ej. `get_remote_address` combinado con `ProxyHeadersMiddleware`/configuración de uvicorn `--proxy-headers`).
   - O subir el límite en producción a un valor que absorba el tráfico agregado.
2. Alternativa robusta a medio plazo: mover el límite a una capa gestionada (Redis) o al proxy/CDN en lugar de por IP de origen.

### Verificación esperada
`GET /api/asteroids/` en producción bajo N clientes distintos debe comportarse como límite por usuario, no agregado.

---

## N3 (residual) — Índices antiguos en bases SQLite existentes

**Severidad:** Baja · **Cuándo resolver:** Despliegue/migración.
**Ámbito:** `backend/db/models.py`.

### Problema
El commit `e745af4` eliminó los índices redundantes (`id` con `index=True`, `close_approach_date` con `index=True`) porque el índice compuesto `ix_asteroides_close_id (close_approach_date, id)` ya los cubre. `Base.metadata.create_all(checkfirst=True)` **no elimina índices ya existentes**: la base `asteroides.db` local (y cualquier copia previa) conserva los índices redundantes hasta que se regenere.

### Impacto
- Sobre-escritura innecesaria de índices en inserts (costo menor).
- Diferencia entre esquema en disco (viejo) y definición del modelo (nuevo).

### Solución propuesta
- En el primer despliegue con datos que migrar: script de migración que ejecute `DROP INDEX IF EXISTS ix_asteroides_id; DROP INDEX IF EXISTS ix_asteroides_close_approach_date;` (nombres reales de los índices generados) y/o un sistema de migraciones (Alembic).
- Para la base local: eliminar `asteroides.db` y dejar que `create_all` la regenere, o aplicar el DROP manual.
