# Produccion Beto - CMMS

Sistema CMMS (Gestión de Mantenimiento Computarizado) para planta industrial con registro de intervenciones via QR y backoffice administrativo.

## Stack
- **Backend:** Go (Gin), SQLite/SQL Server
- **Frontend:** HTML estático (backoffice.html, qr.html)
- **Tests:** Playwright (E2E)
- **Infra:** Docker, GitHub Actions

## Cómo correr

### Backend
```bash
cd backend
cp .env.example .env   # editar con tus valores
go run main.go
```

### Frontend (prototipos estáticos)
```bash
python3 -m http.server 8888
# Abrir http://localhost:8888/backoffice.html o qr.html
```

### Tests
```bash
npm install
npx playwright test
```

## Estructura
- `backend/` — API REST en Go: handlers, models, middleware, migrations, seeds
- `backoffice.html` — Panel administrativo (dashboard, ABM de maquinas, ordenes, repuestos, usuarios)
- `qr.html` — Registro de mantenimiento via escaneo QR
- `tests/` — Tests E2E con Playwright
- `nodered-*.json` — Flujos de Node-RED auxiliares
