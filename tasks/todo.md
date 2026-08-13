# TODO CMMS

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
