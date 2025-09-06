-- =============================================================================
-- REACTIVAR RLS DESPUÉS DE CREAR GESTORES
-- =============================================================================

-- Reactivar RLS en profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Crear políticas simplificadas para gestores
-- =============================================================================

-- Los usuarios pueden ver su propio perfil
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- Los usuarios pueden actualizar su propio perfil
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Los admins pueden ver y gestionar todos los perfiles
DROP POLICY IF EXISTS "Admins can manage all profiles" ON profiles;
CREATE POLICY "Admins can manage all profiles" ON profiles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- Los gestores pueden ver y gestionar perfiles de su academia (excepto otros gestores y admins)
DROP POLICY IF EXISTS "Gestores pueden gestionar perfiles de su academia" ON profiles;
CREATE POLICY "Gestores pueden gestionar perfiles de su academia" ON profiles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles p1, profiles p2
      WHERE p1.id = auth.uid() 
      AND p1.role = 'gestor'
      AND p2.id = profiles.id
      AND p1.academia_id = p2.academia_id
      AND p2.role IN ('profesor', 'alumno')
    )
  );

-- =============================================================================
-- EJECUTAR SOLO DESPUÉS DE CREAR TODOS LOS GESTORES NECESARIOS
-- =============================================================================
