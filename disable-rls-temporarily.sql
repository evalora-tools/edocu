-- =============================================================================
-- DESHABILITAR RLS TEMPORALMENTE PARA CREAR GESTORES
-- =============================================================================

-- Deshabilitar RLS temporalmente en profiles para poder crear gestores
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- También actualizar la restricción de roles
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check 
CHECK (role IN ('admin', 'gestor', 'profesor', 'alumno'));

-- =============================================================================
-- INSTRUCCIONES:
-- =============================================================================
/*
1. Ejecuta este script
2. Crea los gestores que necesites
3. Luego ejecuta el script enable-rls-again.sql para reactivar la seguridad
*/
