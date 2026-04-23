-- CMMS Pro - Azure SQL Server Schema

CREATE TABLE Usuarios (
    id           NVARCHAR(50)  PRIMARY KEY,
    nombre       NVARCHAR(100) NOT NULL,
    rol          NVARCHAR(20)  NOT NULL CHECK (rol IN ('Data Entry', 'Tecnico', 'Administrador')),
    pin          NVARCHAR(10)  NOT NULL,
    estado       NVARCHAR(10)  NOT NULL DEFAULT 'Activo' CHECK (estado IN ('Activo', 'Inactivo')),
    created_at   DATETIME2     NOT NULL DEFAULT GETDATE()
);

CREATE TABLE Maquinas (
    id                        NVARCHAR(20)  PRIMARY KEY,
    nombre                    NVARCHAR(150) NOT NULL,
    ubicacion                 NVARCHAR(200) NOT NULL,
    serie                     NVARCHAR(100) NULL,
    estado                    NVARCHAR(20)  NOT NULL DEFAULT 'Operativo'
                              CHECK (estado IN ('Operativo', 'Mant. vencido', 'Prox. mant.')),
    ultimo_mantenimiento      DATE          NULL,
    proximo_mantenimiento     DATE          NULL,
    frecuencia_mantenimiento  NVARCHAR(20)  NOT NULL DEFAULT 'Trimestral'
                              CHECK (frecuencia_mantenimiento IN ('Mensual', 'Bimestral', 'Trimestral', 'Semestral', 'Anual')),
    created_at                DATETIME2     NOT NULL DEFAULT GETDATE()
);

CREATE TABLE Componentes (
    id         INT IDENTITY(1,1) PRIMARY KEY,
    nombre     NVARCHAR(100) NOT NULL,
    maquina_id NVARCHAR(20)  NOT NULL,
    FOREIGN KEY (maquina_id) REFERENCES Maquinas(id) ON DELETE CASCADE
);

CREATE TABLE Repuestos (
    codigo        NVARCHAR(20)  PRIMARY KEY,
    descripcion   NVARCHAR(200) NOT NULL,
    categoria     NVARCHAR(30)  NOT NULL
                  CHECK (categoria IN ('Rodamientos', 'Correas y Transmision', 'Ventilacion',
                         'Lubricantes', 'Turbina', 'Electricidad', 'Filtros')),
    stock_actual  INT           NOT NULL DEFAULT 0,
    stock_minimo  INT           NOT NULL DEFAULT 0,
    created_at    DATETIME2     NOT NULL DEFAULT GETDATE()
);

CREATE TABLE Registros (
    id                    INT IDENTITY(1,1) PRIMARY KEY,
    maquina_id            NVARCHAR(20)  NOT NULL,
    fecha                 DATETIME2     NOT NULL,
    tipo                  NVARCHAR(20)  NOT NULL
                          CHECK (tipo IN ('Preventivo', 'Correctivo', 'Predictivo', 'Emergencia')),
    tecnico_id            NVARCHAR(50)  NOT NULL,
    registrado_por_id     NVARCHAR(50)  NOT NULL,
    proximo_mantenimiento DATE          NULL,
    observaciones         NVARCHAR(MAX) NULL,
    created_at            DATETIME2     NOT NULL DEFAULT GETDATE(),
    FOREIGN KEY (maquina_id) REFERENCES Maquinas(id),
    FOREIGN KEY (tecnico_id) REFERENCES Usuarios(id),
    FOREIGN KEY (registrado_por_id) REFERENCES Usuarios(id)
);

CREATE TABLE RegistroComponentes (
    id                INT IDENTITY(1,1) PRIMARY KEY,
    registro_id       INT           NOT NULL,
    componente_id     INT           NOT NULL,
    trabajo_realizado NVARCHAR(MAX) NULL,
    FOREIGN KEY (registro_id) REFERENCES Registros(id) ON DELETE CASCADE,
    FOREIGN KEY (componente_id) REFERENCES Componentes(id)
);

CREATE TABLE RegistroRepuestos (
    id                      INT IDENTITY(1,1) PRIMARY KEY,
    registro_componente_id  INT          NOT NULL,
    repuesto_codigo         NVARCHAR(20) NOT NULL,
    cantidad                INT          NOT NULL DEFAULT 1,
    FOREIGN KEY (registro_componente_id) REFERENCES RegistroComponentes(id) ON DELETE CASCADE,
    FOREIGN KEY (repuesto_codigo) REFERENCES Repuestos(codigo)
);

CREATE INDEX IX_Registros_MaquinaId ON Registros(maquina_id);
CREATE INDEX IX_Registros_Fecha ON Registros(fecha DESC);
CREATE INDEX IX_Componentes_MaquinaId ON Componentes(maquina_id);
CREATE INDEX IX_Repuestos_Categoria ON Repuestos(categoria);
