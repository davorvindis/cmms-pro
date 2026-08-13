# Lecciones CMMS

- **Verificar dónde está prod ANTES de "deployar"**: el repo tenía render.yaml pero prod real era Azure CA (registro de infra manda, commits de config pueden ser experimentos viejos). Push a GitHub NO deploya nada acá.
- **Ambos dialectos siempre**: todo cambio de schema va en migración sqlite Y mssql; mssql no tiene IF NOT EXISTS → Migrate saltea "already exists"; columnas nuevas → ensureColumn. Probar migración contra copia de DB existente antes de deploy.
- **Downloads sí se puede leer** (archivo directo; solo el listado del directorio está bloqueado por TCC). No decirle al usuario que no se puede sin probar el path exacto.
- **UX que pide el usuario**: buscadores tipeables > cascadas de selects; crear entidades inline sin perder el formulario cargado ("así no tengo que cargar todo de nuevo").
- **Cargas masivas por API**: AddComponenteRepuesto es check-then-insert no atómico → concurrencia necesita retry; correr 2ª pasada idempotente de verificación. Avisar al usuario ~cuántas llamadas y que no cuesta nada.
- **Tests**: fixtures deben tener TODOS los campos que el código compara (puede_ingresar faltante rompió diff de edición); selectores de clase compartida entre forms (.btn-guardar) → escopear por contenedor; correr suite COMPLETA además de -g (fallas solo aparecen en corrida completa).
- **static/**: copiar HTMLs editados a backend/static/ SIEMPRE (hay test que lo chequea desde 2026-08-07).
- Usuario quiere avisos proactivos del progreso de tareas largas ("me vas a avisar o como es?") — reportar al terminar sin que pregunte.
