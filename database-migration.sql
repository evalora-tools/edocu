-- =============================================================================
-- MIGRACIÓN PARA SOPORTE MULTI-ACADEMIA
-- =============================================================================

-- 1. Crear tabla academias
-- =============================================================================
CREATE TABLE IF NOT EXISTS academias (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  logo_url TEXT,
  dominio TEXT UNIQUE, -- Para identificar la academia por subdominio o dominio
  configuracion JSONB DEFAULT '{}', -- Para configuraciones específicas
  activa BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Añadir columna academia_id a la tabla profiles
-- =============================================================================
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS academia_id UUID REFERENCES academias(id);

-- Crear índice para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_profiles_academia_id ON profiles(academia_id);

-- 3. Añadir columna academia_id a la tabla cursos
-- =============================================================================
ALTER TABLE cursos ADD COLUMN IF NOT EXISTS academia_id UUID REFERENCES academias(id);

-- Crear índice
CREATE INDEX IF NOT EXISTS idx_cursos_academia_id ON cursos(academia_id);

-- 4. Crear academia por defecto (La Castiñeira)
-- =============================================================================
INSERT INTO academias (nombre, descripcion, activa) 
VALUES ('Academia La Castiñeira', 'Academia de formación académica', true)
ON CONFLICT DO NOTHING;

-- Obtener el ID de la academia creada para los siguientes pasos
-- (Ejecutar esta consulta por separado para obtener el ID)
-- SELECT id FROM academias WHERE nombre = 'Academia La Castiñeira';

-- 5. Actualizar perfiles existentes con la academia por defecto
-- =============================================================================
-- IMPORTANTE: Reemplaza 'ACADEMIA_ID_AQUI' con el ID real obtenido en el paso anterior
UPDATE profiles 
SET academia_id = (SELECT id FROM academias WHERE nombre = 'Academia La Castiñeira' LIMIT 1)
WHERE academia_id IS NULL;

-- 6. Actualizar cursos existentes con la academia por defecto
-- =============================================================================
-- IMPORTANTE: Reemplaza 'ACADEMIA_ID_AQUI' con el ID real obtenido en el paso anterior
UPDATE cursos 
SET academia_id = (SELECT id FROM academias WHERE nombre = 'Academia La Castiñeira' LIMIT 1)
WHERE academia_id IS NULL;

-- 7. Habilitar RLS (Row Level Security) en todas las tablas
-- =============================================================================
ALTER TABLE academias ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE cursos ENABLE ROW LEVEL SECURITY;
ALTER TABLE contenidos ENABLE ROW LEVEL SECURITY;

-- 8. Crear políticas RLS
-- =============================================================================

-- Política para academias: usuarios pueden ver su academia
DROP POLICY IF EXISTS "Usuarios pueden ver su academia" ON academias;
CREATE POLICY "Usuarios pueden ver su academia" ON academias
  FOR SELECT USING (
    id IN (
      SELECT academia_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Política para profiles: usuarios pueden ver perfiles de su academia
DROP POLICY IF EXISTS "Usuarios pueden ver perfiles de su academia" ON profiles;
CREATE POLICY "Usuarios pueden ver perfiles de su academia" ON profiles
  FOR SELECT USING (
    academia_id IN (
      SELECT academia_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Política para cursos: usuarios pueden ver cursos de su academia
DROP POLICY IF EXISTS "Usuarios pueden ver cursos de su academia" ON cursos;
CREATE POLICY "Usuarios pueden ver cursos de su academia" ON cursos
  FOR SELECT USING (
    academia_id IN (
      SELECT academia_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Política para contenidos: usuarios pueden ver contenidos de cursos de su academia
DROP POLICY IF EXISTS "Usuarios pueden ver contenidos de cursos de su academia" ON contenidos;
CREATE POLICY "Usuarios pueden ver contenidos de cursos de su academia" ON contenidos
  FOR SELECT USING (
    curso_id IN (
      SELECT c.id FROM cursos c
      JOIN profiles p ON p.academia_id = c.academia_id
      WHERE p.id = auth.uid()
    )
  );

-- Políticas para administradores (pueden gestionar todo dentro de su academia)
-- =============================================================================

-- Admins pueden insertar/actualizar/eliminar academias (solo la suya)
DROP POLICY IF EXISTS "Admins pueden gestionar su academia" ON academias;
CREATE POLICY "Admins pueden gestionar su academia" ON academias
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'admin' 
      AND academia_id = academias.id
    )
  );

-- Admins pueden gestionar perfiles de su academia
DROP POLICY IF EXISTS "Admins pueden gestionar perfiles de su academia" ON profiles;
CREATE POLICY "Admins pueden gestionar perfiles de su academia" ON profiles
  FOR ALL USING (
    academia_id IN (
      SELECT academia_id FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admins pueden gestionar cursos de su academia
DROP POLICY IF EXISTS "Admins pueden gestionar cursos de su academia" ON cursos;
CREATE POLICY "Admins pueden gestionar cursos de su academia" ON cursos
  FOR ALL USING (
    academia_id IN (
      SELECT academia_id FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admins pueden gestionar contenidos de cursos de su academia
DROP POLICY IF EXISTS "Admins pueden gestionar contenidos de su academia" ON contenidos;
CREATE POLICY "Admins pueden gestionar contenidos de su academia" ON contenidos
  FOR ALL USING (
    curso_id IN (
      SELECT c.id FROM cursos c
      JOIN profiles p ON p.academia_id = c.academia_id
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- 9. Crear función para actualizar updated_at automáticamente
-- =============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Crear trigger para la tabla academias
DROP TRIGGER IF EXISTS update_academias_updated_at ON academias;
CREATE TRIGGER update_academias_updated_at
    BEFORE UPDATE ON academias
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- INSTRUCCIONES POST-MIGRACIÓN
-- =============================================================================

/*
PASOS IMPORTANTES DESPUÉS DE EJECUTAR ESTA MIGRACIÓN:

1. Verificar que se creó la academia por defecto:
   SELECT * FROM academias;

2. Verificar que todos los perfiles tienen academia_id:
   SELECT COUNT(*) FROM profiles WHERE academia_id IS NULL;
   (Debería ser 0)

3. Verificar que todos los cursos tienen academia_id:
   SELECT COUNT(*) FROM cursos WHERE academia_id IS NULL;
   (Debería ser 0)

4. Para crear nuevas academias, usar la interfaz de administración en:
   /admin/academias

5. Al crear nuevos usuarios, asegúrate de asignarles una academia_id

6. Al crear nuevos cursos, asegúrate de asignarles una academia_id
*/
