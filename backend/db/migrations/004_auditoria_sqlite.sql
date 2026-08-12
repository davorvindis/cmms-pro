-- Auditoria: registro de toda escritura (POST/PUT/DELETE) hecha por usuarios autenticados.

CREATE TABLE IF NOT EXISTS AuditLog (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    fecha          TEXT NOT NULL DEFAULT (datetime('now')),
    usuario_id     TEXT NOT NULL,
    usuario_nombre TEXT NOT NULL,
    metodo         TEXT NOT NULL,
    ruta           TEXT NOT NULL,
    entidad        TEXT NOT NULL,
    detalle        TEXT
);

CREATE INDEX IF NOT EXISTS IX_AuditLog_Fecha ON AuditLog(fecha DESC);
