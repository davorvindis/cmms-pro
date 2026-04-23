-- CMMS Pro - Seed Data

-- Usuarios
INSERT INTO Usuarios (id, nombre, rol, pin) VALUES ('admin', 'Administrador', 'Administrador', '1234');
INSERT INTO Usuarios (id, nombre, rol, pin) VALUES ('data-entry1', 'Maciel', 'Data Entry', '1111');
INSERT INTO Usuarios (id, nombre, rol, pin) VALUES ('tecnico1', 'Juan Perez', 'Tecnico', '2222');
INSERT INTO Usuarios (id, nombre, rol, pin) VALUES ('tecnico2', 'Carlos Gomez', 'Tecnico', '3333');
INSERT INTO Usuarios (id, nombre, rol, pin) VALUES ('tecnico3', 'Miguel Rodriguez', 'Tecnico', '4444');

-- Maquinas
INSERT INTO Maquinas (id, nombre, ubicacion, serie, estado, ultimo_mantenimiento, proximo_mantenimiento, frecuencia_mantenimiento)
VALUES ('MAQ-001', 'Maquina Grande - Linea 1', 'Planta Principal - Sector Produccion - Nave 2', 'MG-2024-0847', 'Operativo', '2026-04-21', '2026-07-21', 'Trimestral');

INSERT INTO Maquinas (id, nombre, ubicacion, estado, ultimo_mantenimiento, proximo_mantenimiento, frecuencia_mantenimiento)
VALUES ('MAQ-002', 'Prensa Hidraulica PH-200', 'Planta - Nave 1', 'Operativo', '2026-04-18', '2026-06-18', 'Bimestral');

INSERT INTO Maquinas (id, nombre, ubicacion, estado, ultimo_mantenimiento, proximo_mantenimiento, frecuencia_mantenimiento)
VALUES ('MAQ-003', 'Bomba Centrifuga P-200', 'Planta - Sector A', 'Mant. vencido', '2026-02-10', '2026-04-19', 'Bimestral');

INSERT INTO Maquinas (id, nombre, ubicacion, estado, ultimo_mantenimiento, proximo_mantenimiento, frecuencia_mantenimiento)
VALUES ('MAQ-004', 'Compresor Industrial XR-400', 'Planta - Nave 2', 'Operativo', '2026-04-01', '2026-07-01', 'Trimestral');

INSERT INTO Maquinas (id, nombre, ubicacion, estado, ultimo_mantenimiento, proximo_mantenimiento, frecuencia_mantenimiento)
VALUES ('MAQ-005', 'Torno CNC T-500', 'Taller mecanico', 'Prox. mant.', '2026-03-15', '2026-04-28', 'Mensual');

-- Componentes MAQ-001
INSERT INTO Componentes (nombre, maquina_id) VALUES ('Turbina', 'MAQ-001');
INSERT INTO Componentes (nombre, maquina_id) VALUES ('Motor', 'MAQ-001');
INSERT INTO Componentes (nombre, maquina_id) VALUES ('Correa', 'MAQ-001');
INSERT INTO Componentes (nombre, maquina_id) VALUES ('Ventilador', 'MAQ-001');
INSERT INTO Componentes (nombre, maquina_id) VALUES ('Rodamientos', 'MAQ-001');
INSERT INTO Componentes (nombre, maquina_id) VALUES ('Sistema electrico', 'MAQ-001');

-- Componentes MAQ-002
INSERT INTO Componentes (nombre, maquina_id) VALUES ('Cilindro', 'MAQ-002');
INSERT INTO Componentes (nombre, maquina_id) VALUES ('Bomba hidraulica', 'MAQ-002');
INSERT INTO Componentes (nombre, maquina_id) VALUES ('Valvulas', 'MAQ-002');

-- Componentes MAQ-003
INSERT INTO Componentes (nombre, maquina_id) VALUES ('Impulsor', 'MAQ-003');
INSERT INTO Componentes (nombre, maquina_id) VALUES ('Sello mecanico', 'MAQ-003');
INSERT INTO Componentes (nombre, maquina_id) VALUES ('Motor', 'MAQ-003');

-- Componentes MAQ-004
INSERT INTO Componentes (nombre, maquina_id) VALUES ('Cabezal', 'MAQ-004');
INSERT INTO Componentes (nombre, maquina_id) VALUES ('Motor', 'MAQ-004');
INSERT INTO Componentes (nombre, maquina_id) VALUES ('Filtros', 'MAQ-004');
INSERT INTO Componentes (nombre, maquina_id) VALUES ('Tanque receptor', 'MAQ-004');
INSERT INTO Componentes (nombre, maquina_id) VALUES ('Valvula de seguridad', 'MAQ-004');

-- Componentes MAQ-005
INSERT INTO Componentes (nombre, maquina_id) VALUES ('Husillo', 'MAQ-005');
INSERT INTO Componentes (nombre, maquina_id) VALUES ('Guias', 'MAQ-005');
INSERT INTO Componentes (nombre, maquina_id) VALUES ('Servomotor', 'MAQ-005');

-- Repuestos
INSERT INTO Repuestos (codigo, descripcion, categoria, stock_actual, stock_minimo) VALUES ('ROD-001', 'Rodamiento 6205-2RS SKF', 'Rodamientos', 3, 5);
INSERT INTO Repuestos (codigo, descripcion, categoria, stock_actual, stock_minimo) VALUES ('ROD-002', 'Rodamiento 6305-2RS SKF', 'Rodamientos', 8, 5);
INSERT INTO Repuestos (codigo, descripcion, categoria, stock_actual, stock_minimo) VALUES ('ROD-003', 'Rodamiento axial 51105', 'Rodamientos', 4, 3);
INSERT INTO Repuestos (codigo, descripcion, categoria, stock_actual, stock_minimo) VALUES ('COR-001', 'Correa transmision CT-250', 'Correas y Transmision', 2, 4);
INSERT INTO Repuestos (codigo, descripcion, categoria, stock_actual, stock_minimo) VALUES ('COR-002', 'Tensor de correa TC-80', 'Correas y Transmision', 6, 3);
INSERT INTO Repuestos (codigo, descripcion, categoria, stock_actual, stock_minimo) VALUES ('COR-003', 'Polea conducida PC-120', 'Correas y Transmision', 3, 2);
INSERT INTO Repuestos (codigo, descripcion, categoria, stock_actual, stock_minimo) VALUES ('VEN-001', 'Ventilador completo VT-400', 'Ventilacion', 1, 2);
INSERT INTO Repuestos (codigo, descripcion, categoria, stock_actual, stock_minimo) VALUES ('VEN-002', 'Aspa ventilador AV-60', 'Ventilacion', 10, 4);
INSERT INTO Repuestos (codigo, descripcion, categoria, stock_actual, stock_minimo) VALUES ('VEN-003', 'Motor ventilador MV-100', 'Ventilacion', 2, 2);
INSERT INTO Repuestos (codigo, descripcion, categoria, stock_actual, stock_minimo) VALUES ('LUB-001', 'Grasa SKF LGMT 3 (400g)', 'Lubricantes', 5, 6);
INSERT INTO Repuestos (codigo, descripcion, categoria, stock_actual, stock_minimo) VALUES ('LUB-002', 'Aceite motor 5W-30 5L', 'Lubricantes', 8, 4);
INSERT INTO Repuestos (codigo, descripcion, categoria, stock_actual, stock_minimo) VALUES ('LUB-003', 'Aceite multiuso 1L', 'Lubricantes', 12, 6);
INSERT INTO Repuestos (codigo, descripcion, categoria, stock_actual, stock_minimo) VALUES ('TUR-001', 'Alabe de turbina T-100', 'Turbina', 2, 3);
INSERT INTO Repuestos (codigo, descripcion, categoria, stock_actual, stock_minimo) VALUES ('TUR-002', 'Sello mecanico ST-50', 'Turbina', 4, 3);
INSERT INTO Repuestos (codigo, descripcion, categoria, stock_actual, stock_minimo) VALUES ('TUR-003', 'Junta de turbina JT-30', 'Turbina', 6, 4);
INSERT INTO Repuestos (codigo, descripcion, categoria, stock_actual, stock_minimo) VALUES ('ELE-001', 'Fusible 10A', 'Electricidad', 20, 10);
INSERT INTO Repuestos (codigo, descripcion, categoria, stock_actual, stock_minimo) VALUES ('ELE-002', 'Contactor 25A', 'Electricidad', 3, 2);
INSERT INTO Repuestos (codigo, descripcion, categoria, stock_actual, stock_minimo) VALUES ('ELE-003', 'Rele termico RT-20', 'Electricidad', 2, 3);
INSERT INTO Repuestos (codigo, descripcion, categoria, stock_actual, stock_minimo) VALUES ('FIL-001', 'Filtro aceite FM-50', 'Filtros', 6, 4);
INSERT INTO Repuestos (codigo, descripcion, categoria, stock_actual, stock_minimo) VALUES ('FIL-002', 'Filtro aire FA-200', 'Filtros', 8, 4);
