# TODO CMMS

## EN CURSO — Absorber app Electrónica (sesión 2026-09-17)
Decisión: opción híbrida. Todos ven todo, UI seccionada por disciplina, filtro inicial = disciplina del usuario.
Vocabulario DB: `Mecanico` | `Electrico` (el que ya usa Repuestos). Usuarios además `Ambas`.

### Backend (fork)
- [x] ensureColumn: Usuarios.disciplina (Ambas para Administrador existente), Tareas/Mantenimientos/Registros.disciplina, Maquinas.plc/hmi/hmi_estado/doc_url
- [x] Models + handlers: disciplina en JSON de usuario/tarea/mantenimiento/registro; `?disciplina=` en listados; campos electrónica en máquinas
- [x] Dashboard stats/alertas con `?disciplina=`
- [x] Servir /manifest.webmanifest, /sw.js, /icons/* desde static
- [x] `go build` + `go vet` OK, smoke local sqlite

### Frontend (yo)
- [x] Selector de disciplina en topbar (persistido), filtra tareas/mants/registros/repuestos/dashboard
- [x] Usuarios: campo disciplina en alta/edición y en tabla
- [x] Máquinas: campos PLC/HMI/estado HMI/URL doc en modal y ficha
- [x] Tareas y Mantenimientos: disciplina en alta + badge
- [x] Registros: disciplina al crear (backoffice y qr.html)
- [x] qr.html: checklist filtrado por disciplina, selector si usuario es Ambas
- [x] PWA: manifest, sw.js (cache-first estáticos, network-first API), íconos, meta theme-color/apple
- [x] Layout mobile: sidebar → drawer con hamburguesa, tablas scroll horizontal, stats 2 col
- [x] Copiar HTML a backend/static, playwright verde (132), tests nuevos de consistencia

### Cierre
- [x] Bitácora + CLAUDE.md + registro-apps (decisión: Supabase de Gastón se apaga cuando electrónica migre)
- [ ] Deploy v15 + smoke

### Fase 2 (no ahora, vienen de la app de Gastón)
- [ ] Minutas (pedidos urgentes de Producción a electrónica)
- [ ] 2 responsables + nota de continuidad entre turnos en órdenes
- [ ] Sugerencias de mejora
- [ ] Importar máquinas/plantillas que Gastón ya cargó en Supabase (pedirle export)

## Pendiente Davor (operativo)
- [ ] Cambiar PIN de admin (sigue 1234) — urgente, 2 min
- [ ] Piloto real: Maciel/Gonzalo cargan un preventivo escaneando QR
- [ ] Pasar lista de repuestos eléctricos (hoy todo Mecanico)
- [ ] Definir si se agrega campo "Estado cuenta horas" a registros

## Backlog técnico
- [ ] Reescribir ~50 tests viejos de qr.spec.js (prototipo pre-backend) → CI verde confiable
- [ ] Repuestos condicionados Protos: agregar campos prioridad/fabricante/ubicación/tiempo reemplazo + cargar hoja "REPUESTOS CONDICIONADOS PROTOS" del Excel de rutinas
- [ ] Frecuencia "Cuatrimestral" en Tareas (hoy "4 meses" ≈ Trimestral con nota en descripción)
- [ ] Evaluar minReplicas 0 en ca-cmms-prod (~USD 15/mes de ahorro, cold start 5-10s) — decidir con Producción
- [ ] CI/CD automático (hoy deploy manual az acr build + containerapp update)

## Hecho (sesiones 2026-08-07 → 08-12)
- [x] Tareas preventivas + checklist QR multi-tilde (v6)
- [x] Disciplina mecánico/eléctrico en repuestos (v6)
- [x] 10 máquinas nuevas con checklists de planillas (prod)
- [x] Eliminar máquina + detalle registro + checklist en backoffice (v7-v9)
- [x] Mantenimientos planificados completos (v10-v13)
- [x] Edición usuarios (v10)
- [x] Data entry MK9/MAX: 141 subconjuntos, 1.636 piezas ×2, 130+116 tareas rutina
- [x] CMMS 2.0: auditoría, bcrypt, rate limit, edición total, toasts, badges (v14)
