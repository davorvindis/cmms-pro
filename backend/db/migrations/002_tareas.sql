-- Tareas de mantenimiento preventivo (checklist por maquina, segun planillas de planta)

CREATE TABLE Tareas (
    id                  INT IDENTITY(1,1) PRIMARY KEY,
    maquina_id          NVARCHAR(20)  NOT NULL,
    nombre              NVARCHAR(200) NOT NULL,
    descripcion         NVARCHAR(MAX) NULL,
    tiempo_estimado_min INT           NULL,
    frecuencia          NVARCHAR(20)  NOT NULL DEFAULT 'Mensual'
                        CHECK (frecuencia IN ('Semanal', 'Quincenal', 'Mensual', 'Bimestral',
                               'Trimestral', 'Semestral', 'Anual')),
    asignado_id         NVARCHAR(50)  NULL,
    orden               INT           NOT NULL DEFAULT 0,
    activa              BIT           NOT NULL DEFAULT 1,
    created_at          DATETIME2     NOT NULL DEFAULT GETDATE(),
    FOREIGN KEY (maquina_id) REFERENCES Maquinas(id) ON DELETE CASCADE,
    FOREIGN KEY (asignado_id) REFERENCES Usuarios(id)
);

-- resultados: multi-tilde de la planilla papel como CSV, ej 'Realizado,Ajustado,Sustituido'
CREATE TABLE RegistroTareas (
    id          INT IDENTITY(1,1) PRIMARY KEY,
    registro_id INT           NOT NULL,
    tarea_id    INT           NOT NULL,
    resultados  NVARCHAR(100) NOT NULL,
    observacion NVARCHAR(MAX) NULL,
    FOREIGN KEY (registro_id) REFERENCES Registros(id) ON DELETE CASCADE,
    FOREIGN KEY (tarea_id) REFERENCES Tareas(id)
);

CREATE INDEX IX_Tareas_MaquinaId ON Tareas(maquina_id);
CREATE INDEX IX_RegistroTareas_RegistroId ON RegistroTareas(registro_id);
CREATE UNIQUE INDEX UQ_RegistroTareas_RegTarea ON RegistroTareas(registro_id, tarea_id);
