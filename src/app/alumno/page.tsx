'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'


interface Curso {
  id: string
  nombre: string
  universidad: string
  curso_academico: string
}

export default function AlumnoPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [academia, setAcademia] = useState<any>(null)
  const [cursosLoading, setCursosLoading] = useState(true)
  const [cursos, setCursos] = useState<Curso[]>([])
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  // Manejar hidratación del cliente

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    const init = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          router.replace('/login')
          return
        }

        setUser(session.user)

        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()

        if (!profileData || profileData.role !== 'alumno') {
          router.replace('/')
          return
        }

        setProfile(profileData)

        if (profileData.academia_id) {
          const { data: academiaData } = await supabase
            .from('academias')
            .select('*')
            .eq('id', profileData.academia_id)
            .single()
          setAcademia(academiaData)
        }
      } catch (err) {
        console.error('Error inicializando:', err)
      } finally {
        setLoading(false)
      }
    }
    if (mounted) init()
  }, [mounted, router])

  useEffect(() => {
    if (!mounted || loading) return;
    if (!user || !profile || profile.role !== 'alumno') {
      setCursosLoading(false)
      return
    }
    const loadCursos = async () => {
      try {
        await new Promise(resolve => setTimeout(resolve, 100))
        const cursosIds: string[] = profile.cursos_adquiridos || []
        if (cursosIds.length === 0) {
          setCursos([])
          setCursosLoading(false)
          return
        }
        const { data: cursosData, error } = await supabase
          .from('cursos')
          .select('id, nombre, universidad, curso_academico')
          .in('id', cursosIds)
          .eq('academia_id', profile.academia_id)
          .order('created_at', { ascending: false })
        if (error) {
          console.error('Error cargando cursos del alumno:', error)
          setCursos([])
        } else {
          setCursos(cursosData || [])
        }
      } catch (err) {
        console.error('Error cargando cursos:', err)
      } finally {
        setCursosLoading(false)
      }
    }
    loadCursos()
  }, [user, profile, loading, mounted])

  // Estados de carga secuenciales para evitar flashing

  if (!mounted || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-100 via-blue-50 to-cyan-25 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando...</p>
        </div>
      </div>
    )
  }


  if (!user || !profile) {
    return null;
  }

  if (cursosLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-100 via-blue-50 to-cyan-25 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando cursos...</p>
        </div>
      </div>
    )
  }

  return (
  <div className="min-h-screen bg-gradient-to-br from-sky-100 via-blue-50 to-cyan-25 flex flex-col">
      {/* Navigation Header - Fixed */}
  <div className="backdrop-blur-md bg-white/80 shadow-md border-b border-white/30 fixed top-0 left-0 right-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="p-2 rounded-md text-blue-600 hover:text-blue-800 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 mr-3"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                <h1 className="text-xl font-semibold text-blue-900 drop-shadow-sm">{academia?.nombre || 'Classroom'}</h1>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-blue-900 font-medium">
                Hola, {profile?.nombre || 'Alumno'}
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
                {!sidebarCollapsed && <span className="transition-opacity duration-300">Inicio</span>}
              </div>

              <div className="mt-8">
                {!sidebarCollapsed && (
                  <h3 className="px-3 text-xs font-semibold text-blue-700 uppercase tracking-wider my-3 transition-opacity duration-300">
                    Mis Cursos
                  </h3>
                )}
                <div className="mt-2 space-y-1">
                  {cursos.map((curso) => (
                    <div 
                      key={curso.id} 
                      onClick={() => router.push(`/alumno/asignatura/${curso.id}`)}
                      className="group flex items-center px-2 py-2 text-sm font-medium rounded-lg cursor-pointer transition-all duration-150 bg-white/0 hover:bg-blue-100/80 text-blue-900 hover:text-blue-700 shadow-sm"
                      title={sidebarCollapsed ? curso.nombre : ''}
                    >
                      <span className="w-6 h-6 bg-blue-200 rounded text-blue-900 text-xs flex items-center justify-center mr-3 flex-shrink-0">
                        {curso.nombre.charAt(0).toUpperCase()}
                      </span>
                      {!sidebarCollapsed && (
                        <span className="truncate transition-opacity duration-300">{curso.nombre}</span>
                      )}
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
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
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
                    onClick={() => router.push(`/alumno/asignatura/${curso.id}`)}
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

