# CMMS

## Qué es
CMMS (mantenimiento industrial) con QR por máquina, EN PRODUCCIÓN con datos reales.
Solicitado por Elvio, coordinado con Beto. Maciel/Gonzalo cargan registros vía QR.

## Arquitectura real (NO es prototipo)
- `backend/` — Go + gin. Handlers CRUD a mano (sin ORM), dialecto dual SQLite/SQL Server (`backend/db/dialect.go`).
- Prod: **Azure Container App `ca-cmms-prod`** (rg-maquinas-prod) + **Azure SQL `cmms_db`** en plc-sql-server (dialecto sqlserver). El `render.yaml`/Turso del repo es experimento viejo de abril, NO es prod.
- Front: `backoffice.html` y `qr.html` self-contained (CSS/JS inline), servidos por el backend desde `backend/static/`.
- **REGLA: tras editar un HTML, copiarlo a `backend/static/`** (hay test de consistencia que lo verifica).

## Módulos
- Máquinas (QR por unidad) → Componentes/conjuntos (seccion agrupa: VE/SE/MAX, MK9/MAX S) → Repuestos (BOM en ComponenteRepuestos; categoria + disciplina Mecanico/Electrico).
- Registros de mantenimiento (histórico, descuenta stock, recalcula estado máquina — helper `actualizarEstadoMaquina` en registros.go).
- Tareas preventivas (checklist multi-tilde de las planillas papel: No realizado/Realizado/Ajustado/Sustituido/Observado; pendientes computados on-the-fly por frecuencia).
- Mantenimientos planificados (orden de trabajo: crear → hoja imprimible → volcar resultado → completar genera Registro).
- Auditoría (middleware transversal: toda escritura a AuditLog, pin redactado; página solo admin).
- Seguridad: PINs bcrypt (security/), rate limit login, auth por headers X-User-ID/X-Pin.

## Migraciones
`backend/db/migrations/00N_*.sql` en AMBOS dialectos (sqlite + mssql), embebidas en `migrate.go`, corren al arrancar. Idempotentes (mssql: errores "already exists" se salatean). Columnas nuevas sobre tablas existentes → helper `ensureColumn`.

## Desarrollo local
```bash
cd backend && go run .            # sqlite ./cmms.db, migra y seedea solo
npx playwright test               # suite (server estático 8888, API mockeada en tests/helpers.js)
```
Login dev: admin / 1234.

## Deploy (manual, NO hay CD)
```bash
git push  # cuenta gh davorvindis (switchear y volver a tabacaleraEspert)
az acr build --registry acrespertshared --image cmms:vN .
az containerapp update -n ca-cmms-prod -g rg-maquinas-prod --image acrespertshared.azurecr.io/cmms:vN
```
Verificar: /health + smoke del feature + logs (`az containerapp logs show`).

## Tests
- `tests/*.spec.js` Playwright, todo mockeado (helpers.js FIXTURES). ~132 verdes.
- **~50 tests viejos de qr.spec.js fallan desde siempre** (apuntan al prototipo pre-backend): CI rojo permanente hasta reescribirlos. No son regresiones.
- UI usa toasts (.toast-ok/.toast-error), no alert(). `.btn-guardar` existe en 2 forms de qr.html: escopear selectores.

## Docs
- `docs/BITACORA.md` — historial de sesiones/deploys.
- `tasks/todo.md`, `tasks/00-decisiones.md`, `tasks/lessons.md`.
- `NOTAS.md` — dominio/planta.
