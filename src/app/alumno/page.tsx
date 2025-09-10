'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

interface Curso {
  id: string
  nombre: string
  universidad: string
  curso_academico: string
}

export default function AlumnoPage() {
  const router = useRouter()
  const { user, profile, academia, loading: authLoading, initialized, signOut } = useAuth()
  const [cursosLoading, setCursosLoading] = useState(true)
  const [cursos, setCursos] = useState<Curso[]>([])
  const [mounted, setMounted] = useState(false)

  // Manejar hidratación del cliente
  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    // Solo ejecutar si el componente está montado y el auth está inicializado
    if (!mounted || !initialized || authLoading) {
      return
    }

    // Si no hay usuario o no es alumno, no cargar cursos
    if (!user || !profile || profile.role !== 'alumno') {
      setCursosLoading(false)
      return
    }

    const loadCursos = async () => {
      try {
        // Pequeña pausa adicional para asegurar que todo esté listo
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
  }, [user, profile, authLoading, initialized, mounted, router])

  // Estados de carga secuenciales para evitar flashing
  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Iniciando...</div>
      </div>
    )
  }

  if (!initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Verificando sesión...</div>
      </div>
    )
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Cargando perfil...</div>
      </div>
    )
  }

  if (!user || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Redirigiendo...</div>
      </div>
    )
  }

  if (profile.role !== 'alumno') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg text-red-600">Acceso denegado</div>
      </div>
    )
  }

  if (cursosLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Cargando cursos...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-600 rounded flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3z"/>
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <h1 className="text-xl font-medium text-gray-900">{academia?.nombre || 'Classroom'}</h1>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                Hola, {profile?.nombre || 'Alumno'}
              </span>
              <button
                onClick={async () => {
                  await signOut()
                }}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Cerrar sesión
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <div className="w-64 min-h-screen bg-white border-r border-gray-200">
          <nav className="mt-5 px-2">
            <div className="space-y-1">
              <div className="bg-blue-50 text-blue-700 group flex items-center px-2 py-2 text-sm font-medium rounded-md">
                <span className="w-6 h-6 bg-blue-600 rounded text-white text-xs flex items-center justify-center mr-3">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                </span>
                Inicio
              </div>

              <div className="mt-8">
                <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Mis Cursos
                </h3>
                <div className="mt-2 space-y-1">
                  {cursos.map((curso) => (
                    <div 
                      key={curso.id} 
                      onClick={() => router.push(`/alumno/asignatura/${curso.id}`)}
                      className="group flex items-center px-2 py-2 text-sm font-medium rounded-md text-gray-600 hover:bg-gray-50 hover:text-gray-900 cursor-pointer"
                    >
                      <span className="w-6 h-6 bg-blue-600 rounded text-white text-xs flex items-center justify-center mr-3">
                        {curso.nombre.charAt(0).toUpperCase()}
                      </span>
                      <span className="truncate">{curso.nombre}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </nav>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-6">
          <div className="max-w-6xl mx-auto">
            {cursos.length === 0 ? (
              <div className="text-center py-12">
                <div className="mx-auto h-24 w-24 text-gray-400">
                  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No hay cursos</h3>
                <p className="mt-1 text-sm text-gray-500">Aún no tienes cursos asignados</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {cursos.map((curso) => (
                  <div
                    key={curso.id}
                    onClick={() => router.push(`/alumno/asignatura/${curso.id}`)}
                    className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow duration-200 cursor-pointer"
                  >
                    {/* Card Header */}
                    <div className="h-36 bg-gradient-to-r from-blue-500 to-blue-600 relative">
                      <div className="absolute top-6 left-6">
                        <h3 className="text-white font-medium text-xl leading-tight line-clamp-2">
                          {curso.nombre}
                        </h3>
                      </div>
                      <div className="absolute top-6 right-6">
                        <button className="text-white hover:bg-white/20 rounded-full p-1">
                          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z"/>
                          </svg>
                        </button>
                      </div>
                      <div className="absolute bottom-6 left-6">
                        <p className="text-white/90 text-base">
                          {curso.universidad}
                        </p>
                      </div>
                      <div className="absolute bottom-6 right-6">
                        <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
                          <span className="text-blue-600 font-medium text-sm">
                            {curso.nombre.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Card Content */}
                    <div className="p-6">
                      <div className="flex items-center justify-between">
                        <span className="text-base text-gray-600">
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
                        <div className="flex items-center space-x-3">
                          <button className="text-gray-400 hover:text-gray-600">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 6.292 4 4 0 000-6.292zM15 21H3v-1a6 6 0 0112 0v1z" />
                            </svg>
                          </button>
                          <button className="text-gray-400 hover:text-gray-600">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                            </svg>
                          </button>
                        </div>
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

