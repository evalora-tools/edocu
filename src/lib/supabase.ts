import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/supabase'

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable')
}

if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable')
}

// El cliente de Supabase para componentes del lado del cliente
export const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: true, // Mantener sesión entre recargas y pestañas
      autoRefreshToken: true, // Refrescar token automáticamente
      detectSessionInUrl: true, // Detectar sesión en URL (para OAuth)
      storage: {
        getItem: (key: string) => {
          const value = localStorage.getItem(key)
          console.log('📖 Supabase storage getItem:', key, value ? 'tiene valor' : 'vacío')
          return value
        },
        setItem: (key: string, value: string) => {
          console.log('💾 Supabase storage setItem:', key, value ? 'guardando datos' : 'valor vacío')
          localStorage.setItem(key, value)
        },
        removeItem: (key: string) => {
          console.log('🗑️ Supabase storage removeItem:', key)
          localStorage.removeItem(key)
        }
      }
    },
    global: {
      headers: {
        'X-Client-Info': 'academias-platform'
      }
    },
    // Configurar reintentos para requests fallidos
    realtime: {
      params: {
        eventsPerSecond: 2 // Limitar eventos en tiempo real
      }
    }
  }
)

// Función helper para manejar errores de Supabase de manera consistente
export function handleSupabaseError(error: any): never {
  console.error('Supabase Error:', error)
  
  if (!error) {
    throw new Error('Error desconocido')
  }
  
  // Manejar errores específicos de rate limiting
  if (error.message?.includes('rate limit') || error.message?.includes('too many requests')) {
    throw new Error('Demasiados intentos. Por favor, espera unos minutos antes de intentar nuevamente.')
  }
  
  // Manejar errores de autenticación específicos
  if (error.message?.includes('Invalid login credentials')) {
    throw new Error('Credenciales incorrectas. Verifica tu email y contraseña.')
  }
  
  if (error.message?.includes('Email not confirmed')) {
    throw new Error('Por favor, confirma tu email antes de iniciar sesión.')
  }
  
  if (error.message?.includes('User not found')) {
    throw new Error('Usuario no encontrado. Verifica tu email.')
  }
  
  if (error.message?.includes('Invalid email')) {
    throw new Error('El formato del email no es válido.')
  }
  
  if (error.message?.includes('Password should be at least')) {
    throw new Error('La contraseña debe tener al menos 6 caracteres.')
  }
  
  if (error.message?.includes('Network error')) {
    throw new Error('Error de conexión. Verifica tu conexión a internet.')
  }
  
  if (error.message?.includes('timeout')) {
    throw new Error('La operación tardó demasiado. Intenta nuevamente.')
  }
  
  // Error genérico si no coincide con ningún patrón específico
  throw new Error(error.message || 'Error en la operación')
}