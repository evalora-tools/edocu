-- =============================================================================
-- MIGRACIÓN PARA AÑADIR ROL "GESTOR"
-- =============================================================================

-- 1. Actualizar la restricción de roles en la tabla profiles
-- =============================================================================
-- Primero, eliminar la restricción existente si existe
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

-- Crear nueva restricción que incluya el rol "gestor"
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check 
CHECK (role IN ('admin', 'gestor', 'profesor', 'alumno'));

-- 2. Crear políticas RLS para gestores
-- =============================================================================

-- Gestores pueden ver y gestionar perfiles de su academia (excepto otros gestores y admins)
DROP POLICY IF EXISTS "Gestores pueden gestionar perfiles de su academia" ON profiles;
CREATE POLICY "Gestores pueden gestionar perfiles de su academia" ON profiles
  FOR ALL USING (
    -- Pueden ver/gestionar usuarios de su academia (excepto admins y otros gestores)
    (academia_id IN (
      SELECT academia_id FROM profiles 
      WHERE id = auth.uid() AND role = 'gestor'
    ) AND role IN ('profesor', 'alumno'))
    OR
    -- O es su propio perfil
    id = auth.uid()
  );

-- Gestores pueden gestionar cursos de su academia
DROP POLICY IF EXISTS "Gestores pueden gestionar cursos de su academia" ON cursos;
CREATE POLICY "Gestores pueden gestionar cursos de su academia" ON cursos
  FOR ALL USING (
    academia_id IN (
      SELECT academia_id FROM profiles 
      WHERE id = auth.uid() AND role = 'gestor'
    )
  );

-- Gestores pueden gestionar contenidos de cursos de su academia
DROP POLICY IF EXISTS "Gestores pueden gestionar contenidos de su academia" ON contenidos;
CREATE POLICY "Gestores pueden gestionar contenidos de su academia" ON contenidos
  FOR ALL USING (
    curso_id IN (
      SELECT c.id FROM cursos c
      JOIN profiles p ON p.academia_id = c.academia_id
      WHERE p.id = auth.uid() AND p.role = 'gestor'
    )
  );

-- Los gestores NO pueden ver o gestionar academias (solo super-admins)
-- Las políticas existentes ya cubren esto

-- =============================================================================
-- NOTAS IMPORTANTES:
-- =============================================================================
/*
- Los "gestores" pueden administrar profesores y alumnos de su academia
- Los "gestores" pueden gestionar cursos y contenidos de su academia  
- Los "gestores" NO pueden ver otras academias ni crear/editar academias
- Solo los "admin" (super-admins) pueden gestionar academias y crear gestores
- Los gestores no pueden ver/editar otros gestores ni admins
*/
