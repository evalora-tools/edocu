import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  console.log('1. Iniciando creación de estudiante')
  
  try {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
    const { email, password, nombre, cursos_ids, academia_id } = await request.json()
    
    console.log('2. Datos recibidos:', { email, nombre, cursos_ids, academia_id })

    // Verificar sesión
    const { data: { session } } = await supabase.auth.getSession()
    console.log('3. Sesión:', session ? 'Existe' : 'No existe')

    if (!session) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    // Verificar rol admin o gestor
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, academia_id')
      .eq('id', session.user.id)
      .single()

    console.log('4. Perfil:', profile)

    if (!profile || !['admin', 'gestor'].includes(profile.role)) {
      return NextResponse.json({ error: 'No autorizado - requiere rol admin o gestor' }, { status: 403 })
    }

    // Crear cliente admin para crear usuarios sin afectar la sesión actual
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Crear usuario usando Admin API
    const { data: { user }, error: signUpError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Confirmar email automáticamente
      user_metadata: {
        nombre,
        role: 'alumno'
      }
    })

    console.log('5. Resultado creación usuario:', user ? 'Éxito' : 'Fallo', signUpError || '')

    if (signUpError || !user) {
      throw signUpError || new Error('No se pudo crear el usuario')
    }

    // Determinar academia_id - usar el proporcionado o el del gestor
    const finalAcademiaId = academia_id || (profile.role === 'gestor' ? profile.academia_id : null)
    
    // Crear/actualizar el perfil usando Admin API
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: user.id,
        email,
        role: 'alumno',
        nombre,
        academia_id: finalAcademiaId,
        cursos_adquiridos: cursos_ids || []
      })

    console.log('6. Resultado actualización perfil:', profileError ? 'Error' : 'Éxito')

    if (profileError) {
      console.error('Error actualizando perfil:', profileError)
      // No eliminamos el usuario ya que el perfil ya existe
      throw new Error('Error al actualizar el perfil del estudiante')
    }

    // Ya no forzamos la confirmación del email - el usuario deberá verificarlo por correo electrónico
    console.log('7. Email pendiente de verificación por el usuario')

    return NextResponse.json({
      success: true,
      message: `Estudiante ${nombre} creado exitosamente. Se ha enviado un correo de verificación al estudiante.`
    })

  } catch (error: any) {
    console.error('Error completo:', error)
    return NextResponse.json(
      { 
        error: error.message || 'Error al crear estudiante',
        details: error
      },
      { status: 500 }
    )
  }
}