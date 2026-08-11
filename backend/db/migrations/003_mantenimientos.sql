-- Mantenimientos planificados (ordenes de trabajo): se planifican en el sistema,
-- se imprime la hoja, se ejecutan en planta y se vuelca el resultado.

CREATE TABLE Mantenimientos (
    id               INT IDENTITY(1,1) PRIMARY KEY,
    maquina_id       NVARCHAR(20)  NOT NULL,
    titulo           NVARCHAR(200) NOT NULL,
    horas_marcha     NVARCHAR(50)  NULL,
    horas_turbinas   NVARCHAR(50)  NULL,
    estado           NVARCHAR(20)  NOT NULL DEFAULT 'Pendiente' CHECK (estado IN ('Pendiente', 'Completado')),
    creado_por_id    NVARCHAR(50)  NOT NULL,
    fecha_completado DATETIME2     NULL,
    registro_id      INT           NULL,
    created_at       DATETIME2     NOT NULL DEFAULT GETDATE(),
    FOREIGN KEY (maquina_id) REFERENCES Maquinas(id) ON DELETE CASCADE,
    FOREIGN KEY (creado_por_id) REFERENCES Usuarios(id),
    FOREIGN KEY (registro_id) REFERENCES Registros(id)
);

CREATE TABLE MantenimientoItems (
    id               INT IDENTITY(1,1) PRIMARY KEY,
    mantenimiento_id INT           NOT NULL,
    componente_id    INT           NOT NULL,
    tarea            NVARCHAR(200) NOT NULL,
    novedades        NVARCHAR(MAX) NULL,
    mecanico_id      NVARCHAR(50)  NULL,
    fecha            DATE          NULL,
    orden            INT           NOT NULL DEFAULT 0,
    FOREIGN KEY (mantenimiento_id) REFERENCES Mantenimientos(id) ON DELETE CASCADE,
    FOREIGN KEY (componente_id) REFERENCES Componentes(id),
    FOREIGN KEY (mecanico_id) REFERENCES Usuarios(id)
);

CREATE INDEX IX_Mantenimientos_MaquinaId ON Mantenimientos(maquina_id);
CREATE INDEX IX_MantenimientoItems_MantId ON MantenimientoItems(mantenimiento_id);
