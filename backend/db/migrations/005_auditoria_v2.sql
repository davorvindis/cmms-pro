-- Auditoria v2: IP de origen y estado anterior (antes) de la fila modificada.

ALTER TABLE AuditLog ADD ip NVARCHAR(45) NULL;

ALTER TABLE AuditLog ADD antes NVARCHAR(MAX) NULL;
