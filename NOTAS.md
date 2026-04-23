# Produccion - Beto
Reunion con Beto / pedido de Elvio

---

## 1. CMMS Propio - Sistema de Mantenimiento con QR

**Objetivo:** Sistema propio de gestion de mantenimiento con codigos QR por maquina.

**Flujo:**
- Cada maquina tiene un QR
- Maciel (data entry) escanea el QR y carga el registro de mantenimiento
- Registra: fecha, hora, tecnico, componentes intervenidos, repuestos usados, proximo mantenimiento
- Los repuestos se cargan como texto libre, por atras se categorizan y normalizan

**Estructura:**
- Maquina → Componentes (ej: Turbina, Motor, Correa, Ventilador, Rodamientos)
- Cada mantenimiento detalla por componente que se hizo y que repuestos se usaron
- Bitacora completa por maquina

**Backoffice:**
- Dashboard con KPIs
- ABM de maquinas y componentes
- Registros de mantenimiento
- Inventario de repuestos categorizados
- Gestion de usuarios (admin, data entry, tecnicos)

**Prototipos:** qr.html y backoffice.html en esta carpeta

---

## 2. Parada de Maquina (tema aparte)

**Objetivo:** Control de downtime con tablet en planta.

**Flujo:**
1. La maquina para
2. Operario toca "Parada" en la tablet → arranca contador de tiempo
3. Escribe motivo de la parada
4. SIN MOTIVO = NO SE PUEDE PONER PLAY (maquina bloqueada)
5. Ingresa motivo → se desbloquea → Play

**Logica del BIT:**
- Tablet laburando (maquina parada) → escribe **1** en variable del PLC
- Variable en **0** → maquina puede arrancar
- Boton de **play de emergencia** (override) para forzar 0 si hay error y no dejar maquina parada al pedo

**Arquitectura:** La tablet corre **Node-RED interno** para escribir el BIT directo al PLC.

**Prueba:** Manana (22/04) Davor intenta escribir la variable del PLC de Beto desde su Node-RED.

**Nota:** Beto genera el BIT, Davor lo carga via Node-RED en la tablet.

---

## 3. BACKLOG — Ideas tomadas de CMMS open source

Investigacion de: openMAINT, Atlas CMMS, SuperCMMS, CalemEAM, Apache OFBiz, MaintSmart, CWorks.
Concepto: tomar lo mejor pero mantener la app **simple**.

### Prioridad Alta (incorporar pronto)
- [ ] **Alertas de stock bajo** — Notificacion en dashboard cuando un repuesto baja del minimo *(idea: Atlas, SuperCMMS)*
- [ ] **Mantenimiento preventivo automatico** — Generar alerta/orden cuando se cumple la frecuencia de una maquina *(idea: Atlas, openMAINT)*
- [ ] **Detalle/historial por maquina** — Click en una maquina → ver toda su bitacora de registros *(idea: todos)*
- [ ] **Botón crear registro desde backoffice** — HECHO ✅

### Prioridad Media (post-deploy)
- [ ] **Exportar a Excel/PDF** — Reportes descargables de registros y stock *(idea: MaintSmart)*
- [ ] **Fotos adjuntas** — Adjuntar foto al registro de mantenimiento desde el celular *(idea: Atlas, CalemEAM)*
- [ ] **Dashboard de downtime** — Metricas de tiempo de parada por maquina *(idea: Atlas, MaintSmart)*
- [ ] **Notificaciones por email/WhatsApp** — Avisar cuando hay mant. vencido o stock critico *(idea: MaintSmart, Atlas)*
- [ ] **Multi-idioma** — No urgente pero Atlas lo tiene en 15+ idiomas

### Prioridad Baja (nice to have)
- [ ] **App mobile nativa** — React Native o PWA para Maciel *(idea: Atlas tiene React Native)*
- [ ] **SLA de mantenimiento** — Definir tiempos objetivo por tipo de mant. *(idea: openMAINT)*
- [ ] **Costos de mantenimiento** — Trackear costo de repuestos por registro *(idea: Atlas, CWorks)*
- [ ] **Ordenes de compra automaticas** — Cuando stock llega al minimo, generar OC *(idea: Atlas)*
- [ ] **Mapa de planta** — Ubicacion visual de maquinas *(idea: Atlas usa Google Maps)*
- [ ] **Analisis de confiabilidad** — Estadisticas tipo MTBF/MTTR *(idea: MaintSmart)*

---

## 4. PENDIENTE: Preguntar a Juampi

- Consultar por modulos para las maquinas **Profibus**

---

## Personas
- **Elvio** — solicita el programa
- **Beto** — reunion, genera BIT para parada de maquina
- **Maciel** — data entry, carga registros via QR
- **Juampi** — consulta por modulos Profibus
- **Tecnicos:** Juan Perez, Carlos Gomez, Miguel Rodriguez
