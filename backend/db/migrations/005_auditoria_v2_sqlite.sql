-- Auditoria v2: IP de origen y estado anterior (antes) de la fila modificada.

ALTER TABLE AuditLog ADD COLUMN ip TEXT;

ALTER TABLE AuditLog ADD COLUMN antes TEXT;
