# Bitácora CMMS

### 2026-08-07 — Tareas preventivas + disciplina + deploy real (v6)
- Entidad Tareas (checklist preventivo por máquina, modelo de planillas papel "PREVENTIVO AMF 3000"): multi-tilde No realizado/Realizado/Ajustado/Sustituido/Observado, tiempo estimado, frecuencia, asignado. Pendientes computados on-the-fly.
- Checklist en qr.html (registros tipo Preventivo) y luego también en modal backoffice.
- Repuestos.disciplina Mecanico/Electrico (816 existentes → Mecanico, decisión Davor).
- Descubierto: prod real = Azure CA + Azure SQL (render.yaml era experimento viejo). Fix migración mssql (skip already-exists) y scan BIT. Fix bug search LIKE (1 arg/2 placeholders).
- Cargadas 10 máquinas (2× AMF 3000, AMF 5000, HLP 250, CIGARRILLERA, GD 4350) con sus checklists desde las planillas. Deploy v6.
- Botón Eliminar máquina (v7, confirma tipeando código). Detalle de registro funcional (v9).

### 2026-08-11 — Mantenimientos planificados + edición usuarios (v10-v13)
- Entidad Mantenimientos (orden de trabajo, planilla "MANTENIMIENTO PREVENTIVO PROTOS ESPERT"): crear (conjunto+tarea libre con sugerencias) → hoja imprimible → volcar resultado por fila (mecánico/novedades/fecha, desde backoffice y QR) → completar genera Registro Preventivo. Editable pendiente (agregar/quitar filas v13). Buscador tipeable de conjuntos (v11) + crear conjunto inline (v12).
- Edición de usuarios (nombre/rol/PIN/acceso/estado).
- Data entry masivo desde Excel (Downloads): 141 subconjuntos + 1.636 piezas × 2 cigarrilleras, 130 tareas rutina c/u, 116 tareas Protos. Script idempotente (scratchpad), 2 pasadas verificadas.
- Repuestos condicionados Protos NO cargados (faltan campos prioridad/fabricante/tiempo reemplazo).

### 2026-08-12 — CMMS 2.0 transversal (v14)
- Auditoría: AuditLog + middleware (toda escritura, pin redactado) + página admin con filtros.
- Seguridad: PINs → bcrypt (backfill 5 en prod, upgrade on-login, cache 5min), rate limit login 10/min.
- Edición completa: repuestos (editar/eliminar), conjuntos (renombrar/eliminar, PUT nuevo), eliminar registro (admin).
- UX: toasts en vez de alert() (62), badges sidebar (vencidas/pendientes), dashboard +2 tiles clickeables, inventario en tandas de 300, título de pestaña.
- Auditoría de salud: backups Azure SQL PITR 7 días OK; máquina basura "a" borrada por Davor.
- Regresión final: 132 pass / 50 fail (todos pre-existentes del prototipo).

## Estado
- Prod: `ca-cmms-prod` imagen **cmms:v14**, DB cmms_db (Azure SQL, PITR 7d), ~USD 22/mes.
- 11 máquinas, 484 tareas, 2.085 repuestos, auditoría activa.
