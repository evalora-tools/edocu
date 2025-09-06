import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    // Verificar autenticación
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    console.log('Usuario actual:', session.user.id)

    // Verificar que el usuario es admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single()

    console.log('Perfil encontrado:', profile)
    console.log('Error de perfil:', profileError)

    if (profileError) {
      return NextResponse.json({ 
        error: `Error obteniendo perfil: ${profileError.message}` 
      }, { status: 500 })
    }

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ 
        error: `Permisos insuficientes. Rol actual: ${profile?.role || 'desconocido'}` 
      }, { status: 403 })
    }

    const { email, password, nombre, academia_id } = await request.json()

    // Validar datos requeridos
    if (!email || !password || !nombre || !academia_id) {
      return NextResponse.json(
        { error: 'Todos los campos son requeridos' },
        { status: 400 }
      )
    }

    // Verificar que la academia existe
    const { data: academia } = await supabase
      .from('academias')
      .select('id')
      .eq('id', academia_id)
      .single()

    if (!academia) {
      return NextResponse.json(
        { error: 'La academia especificada no existe' },
        { status: 400 }
      )
    }

    // Crear usuario en Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          nombre,
          role: 'gestor'
        }
      }
    })

    if (authError) {
      throw new Error(`Error creando usuario: ${authError.message}`)
    }

    if (!authData.user) {
      throw new Error('No se pudo crear el usuario')
    }

    // Crear perfil en la tabla profiles
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: authData.user.id,
        email,
        nombre,
        role: 'gestor',
        academia_id
      })

    if (profileError) {
      // Si falla la creación del perfil, intentar eliminar el usuario de Auth
      console.error('Error creando perfil:', profileError)
      throw new Error(`Error creando perfil: ${profileError.message}`)
    }

    return NextResponse.json({ 
      message: 'Gestor creado exitosamente',
      user_id: authData.user.id 
    })

  } catch (error: any) {
    console.error('Error en create-gestor:', error)
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
