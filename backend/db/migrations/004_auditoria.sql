-- Auditoria: registro de toda escritura (POST/PUT/DELETE) hecha por usuarios autenticados.

CREATE TABLE AuditLog (
    id             INT IDENTITY(1,1) PRIMARY KEY,
    fecha          DATETIME2     NOT NULL DEFAULT GETDATE(),
    usuario_id     NVARCHAR(50)  NOT NULL,
    usuario_nombre NVARCHAR(100) NOT NULL,
    metodo         NVARCHAR(10)  NOT NULL,
    ruta           NVARCHAR(200) NOT NULL,
    entidad        NVARCHAR(50)  NOT NULL,
    detalle        NVARCHAR(MAX) NULL
);

CREATE INDEX IX_AuditLog_Fecha ON AuditLog(fecha DESC);
