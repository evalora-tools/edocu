'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Toast from '@/components/ui/Toast'

interface Curso {
  id: string
  nombre: string
  universidad: string
  curso_academico: string
  profesor_id: string | null
}

interface Academia {
  id: string
  nombre: string
}

export default function ProfesorPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [loadingState, setLoadingState] = useState<string>('Iniciando...')
  const [cursos, setCursos] = useState<Curso[]>([])
  const [academia, setAcademia] = useState<Academia | null>(null)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  useEffect(() => {
    const checkProfesor = async () => {
      try {
        setLoadingState('Verificando sesión...')
        
        const { data: { session } } = await supabase.auth.getSession()
        
        if (!session) {
          setLoadingState('Sin sesión')
          setTimeout(() => {
            router.replace('/login')
          }, 1500)
          return
        }

        setLoadingState('Verificando permisos...')

        const { data: profile } = await supabase
          .from('profiles')
          .select('role, academia_id')
          .eq('id', session.user.id)
          .single()

        if (!profile || profile.role !== 'profesor') {
          setLoadingState('Sin acceso de profesor')
          setTimeout(() => {
            router.replace('/')
          }, 1500)
          return
        }

        setLoadingState('Cargando información...')
        await fetchData(session.user.id, profile.academia_id)
        
        setLoadingState('Finalizando...')
        setTimeout(() => {
          setLoading(false)
        }, 500)

      } catch (error) {
        console.error('Error:', error)
        setLoadingState('Error de conexión')
        setTimeout(() => {
          router.replace('/login')
        }, 1500)
      }
    }

    checkProfesor()
  }, [router])

  const fetchData = async (profesorId: string, academiaId: string) => {
    try {
      setLoadingState('Cargando información de la academia...')
      
      // Cargar información de la academia
      const { data: academiaData, error: academiaError } = await supabase
        .from('academias')
        .select('id, nombre')
        .eq('id', academiaId)
        .single()

      if (academiaError) {
        console.error('Error cargando academia:', academiaError)
      } else {
        setAcademia(academiaData)
      }

      setLoadingState('Cargando cursos asignados...')

      // Primero obtenemos el perfil del profesor para ver sus cursos asignados
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('cursos_asignados')
        .eq('id', profesorId)
        .single()

      if (profileError) {
        console.error('Error cargando perfil:', profileError)
        return
      }

      const cursosAsignados = profileData?.cursos_asignados || []

      setLoadingState('Cargando detalles de los cursos...')

      // Obtener los cursos asignados al profesor
      const { data: cursosData, error: cursosError } = await supabase
        .from('cursos')
        .select('*')
        .in('id', cursosAsignados)
        .eq('academia_id', academiaId)
        .order('created_at', { ascending: false })

      if (cursosError) {
        console.error('Error cargando cursos:', cursosError)
        return
      }

      setCursos(cursosData || [])
    } catch (error) {
      console.error('Error cargando datos:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-100 via-blue-50 to-cyan-25 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">{loadingState}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-100 via-blue-50 to-cyan-25 flex flex-col">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
      
      {/* Navigation Header - Fixed */}
      <div className="backdrop-blur-md bg-white/80 shadow-md border-b border-white/30 fixed top-0 left-0 right-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="mr-4 p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                title={sidebarCollapsed ? "Expandir sidebar" : "Contraer sidebar"}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-600 rounded flex items-center justify-center shadow">
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3z"/>
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <h1 className="text-xl font-semibold text-blue-900 drop-shadow-sm">{academia?.nombre || 'Academia'}</h1>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-blue-900 font-medium">
                Panel Profesor
              </span>
              <button
                onClick={async () => {
                  if (window.confirm('¿Estás seguro de que quieres cerrar sesión?')) {
                    await supabase.auth.signOut();
                    router.push('/login');
                  }
                }}
                className="text-sm text-blue-700 hover:text-blue-900 font-semibold"
              >
                Cerrar sesión
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex pt-16"> {/* Added padding-top to account for fixed header */}
        {/* Sidebar - Fixed */}
        <div className={`${sidebarCollapsed ? 'w-16' : 'w-64'} fixed left-0 top-16 bottom-0 backdrop-blur-md bg-white/80 shadow-md border-r border-white/30 overflow-y-auto transition-all duration-300 ease-in-out`}>
          <nav className="mt-5 px-2">
            <div className="space-y-1">
              <div className="bg-gradient-to-r from-blue-100 to-blue-50 text-blue-900 group flex items-center px-2 py-2 text-sm font-semibold rounded-lg shadow-sm">
                <span className="w-6 h-6 bg-blue-400 rounded text-blue-900 text-xs flex items-center justify-center mr-3 flex-shrink-0">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                </span>
                {!sidebarCollapsed && <span>Inicio</span>}
              </div>

              <div 
                onClick={() => router.push('/profesor/alumnos')}
                className="group flex items-center px-2 py-2 text-sm font-medium rounded-lg cursor-pointer transition-all duration-150 bg-white/0 hover:bg-blue-100/80 text-blue-900 hover:text-blue-700 shadow-sm"
                title={sidebarCollapsed ? "Alumnos" : ""}
              >
                <span className="w-6 h-6 bg-blue-200 rounded text-blue-900 text-xs flex items-center justify-center mr-3 flex-shrink-0">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 6.292 4 4 0 000-6.292zM15 21H3v-1a6 6 0 0112 0v1z" />
                  </svg>
                </span>
                {!sidebarCollapsed && <span>Mis alumnos</span>}
              </div>

              <div 
                onClick={() => router.push('/profesor/analytics')}
                className="group flex items-center px-2 py-2 text-sm font-medium rounded-lg cursor-pointer transition-all duration-150 bg-white/0 hover:bg-blue-100/80 text-blue-900 hover:text-blue-700 shadow-sm"
                title={sidebarCollapsed ? "Estadísticas" : ""}
              >
                <span className="w-6 h-6 bg-blue-200 rounded text-blue-900 text-xs flex items-center justify-center mr-3 flex-shrink-0">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </span>
                {!sidebarCollapsed && <span>Estadísticas</span>}
              </div>

              <div className="mt-8">
                {!sidebarCollapsed && (
                  <h3 className="px-3 text-xs font-semibold text-blue-700 uppercase tracking-wider my-3">
                    Mis Cursos
                  </h3>
                )}
                <div className="mt-2 space-y-1">
                  {cursos.map((curso) => (
                    <div 
                      key={curso.id} 
                      onClick={() => router.push(`/profesor/curso/${curso.id}`)}
                      className="group flex items-center px-2 py-2 text-sm font-medium rounded-lg cursor-pointer transition-all duration-150 bg-white/0 hover:bg-blue-100/80 text-blue-900 hover:text-blue-700 shadow-sm"
                      title={sidebarCollapsed ? curso.nombre : ""}
                    >
                      <span className="w-6 h-6 bg-blue-200 rounded text-blue-900 text-xs flex items-center justify-center mr-3 flex-shrink-0">
                        {curso.nombre.charAt(0).toUpperCase()}
                      </span>
                      {!sidebarCollapsed && <span className="truncate">{curso.nombre}</span>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </nav>
        </div>

        {/* Main Content - Scrollable Area */}
        <div className={`flex-1 ${sidebarCollapsed ? 'ml-16' : 'ml-64'} overflow-y-auto h-[calc(100vh-4rem)] transition-all duration-300 ease-in-out`}>
          <div className="max-w-6xl mx-auto p-8">
            {cursos.length === 0 ? (
              <div className="text-center py-12">
                <div className="mx-auto h-24 w-24 text-blue-300">
                  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <h3 className="mt-2 text-sm font-medium text-blue-900">No hay cursos</h3>
                <p className="mt-1 text-sm text-blue-700">Aún no tienes cursos asignados</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
                {cursos.map((curso) => (
                  <div
                    key={curso.id}
                    onClick={() => router.push(`/profesor/curso/${curso.id}`)}
                    className="rounded-2xl shadow-xl overflow-hidden cursor-pointer bg-gradient-to-br from-blue-600 to-blue-400 hover:scale-[1.03] transition-transform duration-200"
                  >
                    {/* Card Header */}
                    <div className="h-48 flex flex-col justify-between p-7">
                      <div>
                        <h3 className="text-white font-bold text-2xl leading-tight line-clamp-2">
                          {curso.nombre}
                        </h3>
                        <p className="text-blue-100 text-base mt-1">
                          {curso.universidad}
                        </p>
                      </div>
                      <div className="flex items-center justify-between mt-4">
                        <span className="bg-white text-blue-700 font-semibold rounded-full px-3 py-1 text-xs shadow">
                          {(() => {
                            const map: Record<string, string> = {
                              'primero': '1º Curso',
                              'segundo': '2º Curso',
                              'tercero': '3º Curso',
                              'cuarto': '4º Curso',
                              'quinto': '5º Curso',
                              'sexto': '6º Curso',
                              'séptimo': '7º Curso',
                              'octavo': '8º Curso',
                            };
                            return map[curso.curso_academico?.toLowerCase()] || curso.curso_academico;
                          })()}
                        </span>
                        <span className="w-8 h-8 bg-white rounded-full flex items-center justify-center shadow">
                          <span className="text-blue-400 font-bold text-lg">
                            {curso.nombre.charAt(0).toUpperCase()}
                          </span>
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}