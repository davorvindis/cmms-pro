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

### 2026-09-17 — Absorción app Electrónica: disciplina transversal + PWA (v15, pendiente deploy)
- Contexto: Gastón Lator (electrónica) traía por WhatsApp una app propia (Flutter + Supabase + Firebase, "Mantenimiento Expert", paquete 4) que duplicaba máquinas/preventivos/órdenes fuera de Azure y en cuentas personales. Decisión Davor: absorberla en CMMS. Opción elegida: **híbrida** — todos ven todo, UI seccionada por disciplina, filtro inicial = disciplina del usuario.
- Backend: columna `disciplina` (`Mecanico|Electrico`, mismo vocabulario que Repuestos) en Tareas, Mantenimientos y Registros; en Usuarios además `Ambas` (admins existentes backfilleados a Ambas). Máquinas suma `plc`, `hmi`, `hmi_estado`, `doc_url` (campos que traía la app de Gastón). `?disciplina=` en todos los listados, dashboard stats y tareas de máquina. Completar mantenimiento hereda la disciplina al registro. Todo vía ensureColumn + migraciones base en ambos dialectos; smoke sobre copia de DB vieja OK.
- Frontend: selector Mecánica / Electrónica / Todas en topbar (persistido en `cmms_disc`, se resetea al loguear), badges de disciplina en tareas/mantenimientos/registros, campo disciplina en alta de usuario/tarea/mantenimiento/registro (backoffice y QR), sección colapsable "Datos de electrónica" en máquina, ficha QR muestra PLC/HMI/doc. Hoja imprimible mantiene "Mecanico" para mecánica y dice "Tecnico" para electrónica.
- PWA: `manifest.webmanifest` + `sw.js` (estáticos network-first con fallback cache, API nunca cacheada) + íconos en `backend/static/`, rutas en main.go. Layout mobile: sidebar → drawer con hamburguesa, stats 2 col, tablas con scroll, modales a pantalla. Verificado con capturas reales a 390px.
- Tests: +7 backoffice (disciplina, campos electrónica, drawer) +7 consistencia (selects, PWA). Suite: 146 pass / 50 viejos de qr.spec (pre-existentes).
- Fase 2 anotada en todo.md: minutas, 2 responsables + continuidad entre turnos, sugerencias de mejora, importar lo que Gastón cargó en Supabase.
- Deploy v15 OK. El log de arranque destapó bug previo: `Usuarios.pin` era NVARCHAR(10) en Azure SQL → el backfill bcrypt de v14 fallaba silenciosamente ("would be truncated") y los 5 PINs seguían en texto plano. **v16**: `ensurePinLength` amplía a NVARCHAR(100) antes del backfill. Verificado en prod: "Usuarios.pin ampliado" + "PINs migrados a hash: 5", revisión 0000016 Healthy.

## Estado
- Prod: `ca-cmms-prod` imagen **cmms:v16**, DB cmms_db (Azure SQL, PITR 7d), ~USD 22/mes. PINs bcrypt reales desde v16.
- 11 máquinas, 484 tareas, 2.085 repuestos, auditoría activa.
