# CMMS Produccion - Beto

## Qué es este proyecto
Sistema CMMS (Computerized Maintenance Management System) con QR para una planta industrial.
Solicitado por Elvio, coordinado con Beto. Maciel es el data entry que carga registros vía QR.

## Archivos
- `backoffice.html` — Prototipo de backoffice: dashboard, ABM de máquinas, órdenes, repuestos, usuarios. Todo en un solo HTML con CSS/JS inline.
- `qr.html` — Prototipo de registro de mantenimiento vía escaneo QR. Formulario para cargar componentes intervenidos y repuestos usados. UI-only, sin persistencia.
- `NOTAS.md` — Notas de dominio: flujo operativo, personas involucradas, proyecto de parada de máquina.

## Arquitectura
- Front-end only, prototipos estáticos. No hay backend, no hay build system, no hay tests.
- Cada HTML es self-contained: estilos y scripts inline, datos hardcodeados.
- `backoffice.html` usa navegación por pseudo-páginas con `showPage(...)`.
- `qr.html` usa tabs (Nuevo Registro / Historial) y formularios dinámicos con `addComponente()` / `addRepuesto()`.
- Los datos de máquinas, componentes y repuestos están duplicados entre ambos archivos.

## Desarrollo local
```bash
open backoffice.html
open qr.html
# O servir por HTTP:
python3 -m http.server 8000
```

## Reglas
- No hay build, lint ni tests configurados.
- Mantener consistencia de datos entre backoffice.html y qr.html (máquinas, componentes, repuestos).
- Los prototipos deben seguir siendo revisables en browser sin toolchains.
