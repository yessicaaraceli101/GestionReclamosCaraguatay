-- TABLAS PARA SISTEMA DE RECLAMOS CARAGUATAY NET
-- Ejecutar en Supabase > SQL Editor

DROP TABLE IF EXISTS reclamos;
DROP TABLE IF EXISTS usuarios;

CREATE TABLE usuarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario text UNIQUE NOT NULL,
  password text NOT NULL,
  nombre text NOT NULL,
  rol text NOT NULL CHECK (rol IN ('admin','tecnico')),
  ultimo_ingreso timestamp
);

CREATE TABLE reclamos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente text NOT NULL,
  telefono text,
  ubicacion text,
  fecha date,
  descripcion text,
  estado text DEFAULT 'pendiente' CHECK (estado IN ('pendiente','resuelto')),
  creado_por text,
  resuelto_por text,
  resuelto_en timestamp,
  creado_en timestamp DEFAULT now()
);

INSERT INTO usuarios (usuario, password, nombre, rol) VALUES
('admin', 'Admin2026', 'Administrador', 'admin'),
('tec1', 'Tec1001', 'Tecnico 1', 'tecnico'),
('tec2', 'Tec1002', 'Tecnico 2', 'tecnico'),
('tec3', 'Tec1003', 'Tecnico 3', 'tecnico'),
('tec4', 'Tec1004', 'Tecnico 4', 'tecnico'),
('tec5', 'Tec1005', 'Tecnico 5', 'tecnico'),
('tec6', 'Tec1006', 'Tecnico 6', 'tecnico'),
('tec7', 'Tec1007', 'Tecnico 7', 'tecnico'),
('tec8', 'Tec1008', 'Tecnico 8', 'tecnico'),
('tec9', 'Tec1009', 'Tecnico 9', 'tecnico');

-- Para GitHub Pages con login simple por tabla pública:
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE reclamos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "usuarios_select" ON usuarios FOR SELECT USING (true);
CREATE POLICY "usuarios_update_login" ON usuarios FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "reclamos_select" ON reclamos FOR SELECT USING (true);
CREATE POLICY "reclamos_insert" ON reclamos FOR INSERT WITH CHECK (true);
CREATE POLICY "reclamos_update" ON reclamos FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "reclamos_delete" ON reclamos FOR DELETE USING (true);
