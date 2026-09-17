# Lecciones CMMS

- **Verificar dónde está prod ANTES de "deployar"**: el repo tenía render.yaml pero prod real era Azure CA (registro de infra manda, commits de config pueden ser experimentos viejos). Push a GitHub NO deploya nada acá.
- **Ambos dialectos siempre**: todo cambio de schema va en migración sqlite Y mssql; mssql no tiene IF NOT EXISTS → Migrate saltea "already exists"; columnas nuevas → ensureColumn. Probar migración contra copia de DB existente antes de deploy.
- **Downloads sí se puede leer** (archivo directo; solo el listado del directorio está bloqueado por TCC). No decirle al usuario que no se puede sin probar el path exacto.
- **UX que pide el usuario**: buscadores tipeables > cascadas de selects; crear entidades inline sin perder el formulario cargado ("así no tengo que cargar todo de nuevo").
- **Cargas masivas por API**: AddComponenteRepuesto es check-then-insert no atómico → concurrencia necesita retry; correr 2ª pasada idempotente de verificación. Avisar al usuario ~cuántas llamadas y que no cuesta nada.
- **Tests**: fixtures deben tener TODOS los campos que el código compara (puede_ingresar faltante rompió diff de edición); selectores de clase compartida entre forms (.btn-guardar) → escopear por contenedor; correr suite COMPLETA además de -g (fallas solo aparecen en corrida completa).
- **static/**: copiar HTMLs editados a backend/static/ SIEMPRE (hay test que lo chequea desde 2026-08-07).
- Usuario quiere avisos proactivos del progreso de tareas largas ("me vas a avisar o como es?") — reportar al terminar sin que pregunte.
- **Layout mobile en flex**: `.main { flex:1 }` dentro de `.layout { display:flex }` tiene `min-width:auto` → cualquier hijo `nowrap` (topbar) ensancha la página entera y corre los `position:fixed`. Siempre `min-width:0` en el flex item principal + `overflow-x:hidden` en body para ≤900px. Verificar con captura real a 390px, no solo con tests.
- **Smoke con curl desde zsh**: `$H` con varios `-H` NO se divide en palabras en zsh; usar array bash (`A=(-H ...); "${A[@]}"`) o `bash script.sh`.
- **Leer el log de arranque en prod después de CADA deploy** (no solo /health): el backfill de PINs falló 1 mes sin que nadie lo viera porque el error solo estaba en el log. Un "verificado en prod" sin log no es verificación.
