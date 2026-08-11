-- Mantenimientos planificados (ordenes de trabajo): se planifican en el sistema,
-- se imprime la hoja, se ejecutan en planta y se vuelca el resultado.

CREATE TABLE IF NOT EXISTS Mantenimientos (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    maquina_id       TEXT NOT NULL,
    titulo           TEXT NOT NULL,
    horas_marcha     TEXT,
    horas_turbinas   TEXT,
    estado           TEXT NOT NULL DEFAULT 'Pendiente' CHECK (estado IN ('Pendiente', 'Completado')),
    creado_por_id    TEXT NOT NULL,
    fecha_completado TEXT,
    registro_id      INTEGER,
    created_at       TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (maquina_id) REFERENCES Maquinas(id) ON DELETE CASCADE,
    FOREIGN KEY (creado_por_id) REFERENCES Usuarios(id),
    FOREIGN KEY (registro_id) REFERENCES Registros(id)
);

CREATE TABLE IF NOT EXISTS MantenimientoItems (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    mantenimiento_id INTEGER NOT NULL,
    componente_id    INTEGER NOT NULL,
    tarea            TEXT NOT NULL,
    novedades        TEXT,
    mecanico_id      TEXT,
    fecha            TEXT,
    orden            INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (mantenimiento_id) REFERENCES Mantenimientos(id) ON DELETE CASCADE,
    FOREIGN KEY (componente_id) REFERENCES Componentes(id),
    FOREIGN KEY (mecanico_id) REFERENCES Usuarios(id)
);

CREATE INDEX IF NOT EXISTS IX_Mantenimientos_MaquinaId ON Mantenimientos(maquina_id);
CREATE INDEX IF NOT EXISTS IX_MantenimientoItems_MantId ON MantenimientoItems(mantenimiento_id);
