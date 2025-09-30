// Este archivo es solo para testing local y está deshabilitado en producción
/*
import { supabase } from './lib/supabase'

async function testVideoSessions() {
  console.log('=== TESTING VIDEO SESSIONS ===')
  
  // 1. Verificar sesiones de video
  const { data: sessions, error: sessionsError } = await supabase
    .from('video_sessions')
    .select('*')
    .limit(5)
  
  console.log('Video Sessions:', sessions)
  console.log('Sessions Error:', sessionsError)
  
  // 2. Verificar perfiles
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('*')
    .limit(5)
  
  console.log('Profiles:', profiles)
  console.log('Profiles Error:', profilesError)
  
  // 3. Verificar contenidos
  const { data: contenidos, error: contenidosError } = await supabase
    .from('contenidos')
    .select('*')
    .limit(5)
  
  console.log('Contenidos:', contenidos)
  console.log('Contenidos Error:', contenidosError)
  
  // 4. Verificar cursos
  const { data: cursos, error: cursosError } = await supabase
    .from('cursos')
    .select('*')
    .limit(5)
  
  console.log('Cursos:', cursos)
  console.log('Cursos Error:', cursosError)
}

// Si estás en Node.js, puedes ejecutar esto
// testVideoSessions()

export { testVideoSessions }
*/

// Archivo de test deshabilitado en producción
export const testVideoSessions = () => {
  console.warn('Test functions are disabled in production')
}
