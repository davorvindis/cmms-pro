-- CMMS Pro - SQLite Schema (development)

-- rol es texto libre (cargo/funcion). puede_ingresar distingue usuarios con
-- acceso al sistema de personas que solo figuran en registros (sin login).
CREATE TABLE IF NOT EXISTS Usuarios (
    id             TEXT PRIMARY KEY,
    nombre         TEXT NOT NULL,
    rol            TEXT NOT NULL,
    pin            TEXT NOT NULL DEFAULT '',
    puede_ingresar INTEGER NOT NULL DEFAULT 1,
    estado         TEXT NOT NULL DEFAULT 'Activo' CHECK (estado IN ('Activo', 'Inactivo')),
    created_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS Maquinas (
    id                       TEXT PRIMARY KEY,
    nombre                   TEXT NOT NULL,
    ubicacion                TEXT NOT NULL,
    serie                    TEXT,
    estado                   TEXT NOT NULL DEFAULT 'Operativo'
                             CHECK (estado IN ('Operativo', 'Mant. vencido', 'Prox. mant.')),
    ultimo_mantenimiento     TEXT,
    proximo_mantenimiento    TEXT,
    frecuencia_mantenimiento TEXT NOT NULL DEFAULT 'Trimestral'
                             CHECK (frecuencia_mantenimiento IN ('Mensual', 'Bimestral', 'Trimestral', 'Semestral', 'Anual')),
    created_at               TEXT NOT NULL DEFAULT (datetime('now'))
);

-- seccion agrupa los conjuntos dentro de la maquina (ej: VE 100, SE 100, MAX 100 en la Protos)
CREATE TABLE IF NOT EXISTS Componentes (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre     TEXT NOT NULL,
    seccion    TEXT NOT NULL DEFAULT '',
    maquina_id TEXT NOT NULL,
    FOREIGN KEY (maquina_id) REFERENCES Maquinas(id) ON DELETE CASCADE
);

-- nro_hauni: referencia alternativa del fabricante cuando la pieza tiene ambos codigos
CREATE TABLE IF NOT EXISTS Repuestos (
    codigo       TEXT PRIMARY KEY,
    descripcion  TEXT NOT NULL,
    nro_hauni    TEXT,
    categoria    TEXT NOT NULL
                 CHECK (categoria IN ('Rodamientos', 'Correas y Transmision', 'Ventilacion',
                        'Lubricantes', 'Turbina', 'Electricidad', 'Filtros',
                        'Sellos y Retenes', 'Neumatica', 'Resortes', 'Cuchillas y Corte',
                        'Mecanica General')),
    disciplina    TEXT NOT NULL DEFAULT 'Mecanico'
                  CHECK (disciplina IN ('Mecanico', 'Electrico')),
    stock_actual  INTEGER NOT NULL DEFAULT 0,
    stock_minimo  INTEGER NOT NULL DEFAULT 0,
    created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Repuestos que componen cada conjunto (segun planilla del fabricante).
-- cantidad es TEXT porque la planilla trae valores como '2,5 m'.
CREATE TABLE IF NOT EXISTS ComponenteRepuestos (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    componente_id   INTEGER NOT NULL,
    repuesto_codigo TEXT NOT NULL,
    cantidad        TEXT,
    FOREIGN KEY (componente_id) REFERENCES Componentes(id) ON DELETE CASCADE,
    FOREIGN KEY (repuesto_codigo) REFERENCES Repuestos(codigo)
);

CREATE TABLE IF NOT EXISTS Registros (
    id                    INTEGER PRIMARY KEY AUTOINCREMENT,
    maquina_id            TEXT NOT NULL,
    fecha                 TEXT NOT NULL,
    tipo                  TEXT NOT NULL CHECK (tipo IN ('Preventivo', 'Correctivo', 'Predictivo', 'Emergencia')),
    tecnico_id            TEXT NOT NULL,
    registrado_por_id     TEXT NOT NULL,
    proximo_mantenimiento TEXT,
    observaciones         TEXT,
    created_at            TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (maquina_id) REFERENCES Maquinas(id),
    FOREIGN KEY (tecnico_id) REFERENCES Usuarios(id),
    FOREIGN KEY (registrado_por_id) REFERENCES Usuarios(id)
);

CREATE TABLE IF NOT EXISTS RegistroComponentes (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    registro_id       INTEGER NOT NULL,
    componente_id     INTEGER NOT NULL,
    trabajo_realizado TEXT,
    FOREIGN KEY (registro_id) REFERENCES Registros(id) ON DELETE CASCADE,
    FOREIGN KEY (componente_id) REFERENCES Componentes(id)
);

-- referencia: que codigo de proveedor se uso en el cambio (pieza local o Hauni)
CREATE TABLE IF NOT EXISTS RegistroRepuestos (
    id                     INTEGER PRIMARY KEY AUTOINCREMENT,
    registro_componente_id INTEGER NOT NULL,
    repuesto_codigo        TEXT NOT NULL,
    cantidad               INTEGER NOT NULL DEFAULT 1,
    referencia             TEXT CHECK (referencia IN ('Pieza', 'Hauni')),
    FOREIGN KEY (registro_componente_id) REFERENCES RegistroComponentes(id) ON DELETE CASCADE,
    FOREIGN KEY (repuesto_codigo) REFERENCES Repuestos(codigo)
);

CREATE INDEX IF NOT EXISTS IX_Registros_MaquinaId ON Registros(maquina_id);
CREATE INDEX IF NOT EXISTS IX_Registros_Fecha ON Registros(fecha DESC);
CREATE INDEX IF NOT EXISTS IX_Componentes_MaquinaId ON Componentes(maquina_id);
CREATE INDEX IF NOT EXISTS IX_Repuestos_Categoria ON Repuestos(categoria);
CREATE INDEX IF NOT EXISTS IX_ComponenteRepuestos_ComponenteId ON ComponenteRepuestos(componente_id);
