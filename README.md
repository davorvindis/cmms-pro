# CMMS

Sistema CMMS (Gestión de Mantenimiento Computarizado) para planta industrial con registro de intervenciones via QR y backoffice administrativo. En producción: Azure Container App `ca-cmms-prod` + Azure SQL (ver `CLAUDE.md`).

## Stack
- **Backend:** Go (Gin), SQLite (dev) / SQL Server (prod)
- **Frontend:** HTML estático self-contained (backoffice.html, qr.html), servido por el backend + PWA
- **Tests:** Playwright (E2E, API mockeada)
- **Infra:** Docker, Azure (ACR + Container Apps), deploy manual con `az acr build`

## Cómo correr

### Backend
```bash
cd backend
go run .   # sqlite ./cmms.db, migra y seedea solo; .env opcional (ver .env.example)
```

### Frontend
Servido por el backend en http://localhost:8080. Para los tests se usa un server estático:
```bash
python3 -m http.server 8888
# http://localhost:8888/backoffice.html o qr.html (API en :8080)
```

### Tests
```bash
npm install
npx playwright test
```

## Estructura
- `backend/` — API REST en Go: handlers, models, middleware, migrations, seeds, static/
- `backoffice.html` — Panel administrativo (dashboard, ABM de máquinas, órdenes, repuestos, usuarios). Canónico en la raíz; copiar a `backend/static/` tras editar.
- `qr.html` — Registro de mantenimiento vía escaneo QR (misma regla de copia)
- `tests/` — Tests E2E con Playwright
