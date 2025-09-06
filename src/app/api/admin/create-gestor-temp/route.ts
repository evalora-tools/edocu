import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    // Verificar autenticación básica
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { email, password, nombre, academia_id } = await request.json()

    // Validar datos requeridos
    if (!email || !password || !nombre || !academia_id) {
      return NextResponse.json(
        { error: 'Todos los campos son requeridos' },
        { status: 400 }
      )
    }

    console.log('Datos recibidos:', { email, nombre, academia_id })

    // Verificar que la academia existe
    const { data: academia, error: academiaError } = await supabase
      .from('academias')
      .select('id')
      .eq('id', academia_id)
      .single()

    if (academiaError || !academia) {
      return NextResponse.json(
        { error: `La academia especificada no existe: ${academiaError?.message}` },
        { status: 400 }
      )
    }

    console.log('Academia encontrada:', academia)

    // Verificar si el usuario ya existe en profiles
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id, email')
      .eq('email', email)
      .single()

    if (existingProfile) {
      return NextResponse.json(
        { error: 'Ya existe un usuario con este email' },
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
      console.error('Error creando usuario Auth:', authError)
      return NextResponse.json(
        { error: `Error creando usuario: ${authError.message}` },
        { status: 500 }
      )
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: 'No se pudo crear el usuario en Auth' },
        { status: 500 }
      )
    }

    console.log('Usuario Auth creado:', authData.user.id)

    // Verificar si ya existe un perfil con este ID (por si acaso)
    const { data: existingProfileById } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', authData.user.id)
      .single()

    if (existingProfileById) {
      // Si ya existe, actualizar en lugar de insertar
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          nombre,
          role: 'gestor',
          academia_id
        })
        .eq('id', authData.user.id)

      if (updateError) {
        console.error('Error actualizando perfil:', updateError)
        return NextResponse.json(
          { error: `Error actualizando perfil: ${updateError.message}` },
          { status: 500 }
        )
      }
    } else {
      // Crear nuevo perfil
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
        console.error('Error creando perfil:', profileError)
        return NextResponse.json(
          { error: `Error creando perfil: ${profileError.message}` },
          { status: 500 }
        )
      }
    }

    console.log('Perfil creado/actualizado exitosamente')

    return NextResponse.json({ 
      message: 'Gestor creado exitosamente',
      user_id: authData.user.id 
    })

  } catch (error: any) {
    console.error('Error general en create-gestor-temp:', error)
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
