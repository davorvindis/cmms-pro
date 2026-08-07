-- Tareas de mantenimiento preventivo (checklist por maquina, segun planillas de planta)

CREATE TABLE IF NOT EXISTS Tareas (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    maquina_id          TEXT NOT NULL,
    nombre              TEXT NOT NULL,
    descripcion         TEXT,
    tiempo_estimado_min INTEGER,
    frecuencia          TEXT NOT NULL DEFAULT 'Mensual'
                        CHECK (frecuencia IN ('Semanal', 'Quincenal', 'Mensual', 'Bimestral',
                               'Trimestral', 'Semestral', 'Anual')),
    asignado_id         TEXT,
    orden               INTEGER NOT NULL DEFAULT 0,
    activa              INTEGER NOT NULL DEFAULT 1,
    created_at          TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (maquina_id) REFERENCES Maquinas(id) ON DELETE CASCADE,
    FOREIGN KEY (asignado_id) REFERENCES Usuarios(id)
);

-- resultados: multi-tilde de la planilla papel como CSV, ej 'Realizado,Ajustado,Sustituido'
CREATE TABLE IF NOT EXISTS RegistroTareas (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    registro_id INTEGER NOT NULL,
    tarea_id    INTEGER NOT NULL,
    resultados  TEXT NOT NULL,
    observacion TEXT,
    FOREIGN KEY (registro_id) REFERENCES Registros(id) ON DELETE CASCADE,
    FOREIGN KEY (tarea_id) REFERENCES Tareas(id)
);

CREATE INDEX IF NOT EXISTS IX_Tareas_MaquinaId ON Tareas(maquina_id);
CREATE INDEX IF NOT EXISTS IX_RegistroTareas_RegistroId ON RegistroTareas(registro_id);
CREATE UNIQUE INDEX IF NOT EXISTS UQ_RegistroTareas_RegTarea ON RegistroTareas(registro_id, tarea_id);
