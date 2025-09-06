'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Toast from '@/components/ui/Toast'
import VideoAnalyticsPanel from '@/components/video/VideoAnalyticsPanel'

interface Alumno {
  id: string
  email: string
  nombre?: string
  created_at: string
  curso_nombre?: string
  curso_id?: string
}

interface Academia {
  id: string
  nombre: string
}

export default function ProfesorAlumnosPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [alumnos, setAlumnos] = useState<Alumno[]>([])
  const [alumnosFiltrados, setAlumnosFiltrados] = useState<Alumno[]>([])
  const [academia, setAcademia] = useState<Academia | null>(null)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [cursosDisponibles, setCursosDisponibles] = useState<{id: string, nombre: string}[]>([])
  const [cursoSeleccionado, setCursoSeleccionado] = useState<string>('todos')
  const [cursosProfesor, setCursosProfesor] = useState<{id: string, nombre: string}[]>([])
  const [busquedaTexto, setBusquedaTexto] = useState<string>('')
  const [activeTab, setActiveTab] = useState<'alumnos' | 'analytics'>('alumnos')

  useEffect(() => {
    const checkProfesor = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        
        if (!session) {
          setLoading(false)
          router.replace('/login')
          return
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('role, academia_id')
          .eq('id', session.user.id)
          .single()

        if (!profile || profile.role !== 'profesor') {
          setLoading(false)
          router.replace('/')
          return
        }

        setLoading(false)
        fetchData(session.user.id, profile.academia_id)
      } catch (error) {
        console.error('Error:', error)
        router.replace('/login')
      }
    }

    checkProfesor()
  }, [router])

  // Efecto para filtrar alumnos por curso y búsqueda
  useEffect(() => {
    let alumnosFiltradosTemp = alumnos

    // Filtrar por curso
    if (cursoSeleccionado !== 'todos') {
      alumnosFiltradosTemp = alumnosFiltradosTemp.filter(alumno => alumno.curso_id === cursoSeleccionado)
    }

    // Filtrar por texto de búsqueda
    if (busquedaTexto.trim() !== '') {
      const textoBusqueda = busquedaTexto.toLowerCase().trim()
      alumnosFiltradosTemp = alumnosFiltradosTemp.filter(alumno => {
        const nombre = (alumno.nombre || '').toLowerCase()
        const email = alumno.email.toLowerCase()
        return nombre.includes(textoBusqueda) || email.includes(textoBusqueda)
      })
    }

    setAlumnosFiltrados(alumnosFiltradosTemp)
  }, [cursoSeleccionado, alumnos, busquedaTexto])

  // Función para resaltar texto en la búsqueda
  const resaltarTexto = (texto: string, busqueda: string) => {
    if (!busqueda.trim()) return texto
    
    const regex = new RegExp(`(${busqueda.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
    const partes = texto.split(regex)
    
    return partes.map((parte, index) => 
      regex.test(parte) ? (
        <mark key={index} className="bg-yellow-200 px-1 rounded">
          {parte}
        </mark>
      ) : (
        parte
      )
    )
  }

  const fetchData = async (profesorId: string, academiaId: string) => {
    try {
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

      // Primero obtenemos los cursos asignados al profesor
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

      if (cursosAsignados.length === 0) {
        setAlumnos([])
        return
      }

      // Obtener los cursos con sus nombres
      const { data: cursosData, error: cursosError } = await supabase
        .from('cursos')
        .select('id, nombre')
        .in('id', cursosAsignados)
        .eq('academia_id', academiaId)

      if (cursosError) {
        console.error('Error cargando cursos:', cursosError)
        return
      }

      // Crear un mapa de curso ID a nombre
      const cursosMap = cursosData?.reduce((acc, curso) => {
        acc[curso.id] = curso.nombre
        return acc
      }, {} as Record<string, string>) || {}

      // Guardar cursos disponibles para el filtro
      setCursosDisponibles(cursosData || [])
      
      // Guardar cursos para el sidebar (mismo contenido)
      setCursosProfesor(cursosData || [])

      // Obtener todos los perfiles sin filtro de rol primero
      const { data: todosLosPerfiles, error: perfilesError } = await supabase
        .from('profiles')
        .select('id, email, nombre, created_at, cursos_adquiridos, role')
        .eq('academia_id', academiaId)

      if (perfilesError) {
        console.error('Error cargando perfiles:', perfilesError)
        setToast({ message: 'Error al cargar los perfiles. Contacta al administrador.', type: 'error' })
        return
      }

      // Filtrar solo alumnos y que tengan cursos adquiridos
      const alumnos = todosLosPerfiles?.filter(perfil => 
        (perfil.role === 'alumno' || perfil.role === 'estudiante') && 
        perfil.cursos_adquiridos && 
        perfil.cursos_adquiridos.length > 0
      ) || []

      // Filtrar alumnos que tienen al menos un curso en común con el profesor
      const alumnosFiltrados: Alumno[] = []
      
      alumnos.forEach(alumno => {
        const cursosAlumno = alumno.cursos_adquiridos || []
        const cursosEnComun = cursosAlumno.filter((cursoId: string) => cursosAsignados.includes(cursoId))
        
        if (cursosEnComun.length > 0) {
          // Agregar un registro por cada curso en común
          cursosEnComun.forEach((cursoId: string) => {
            alumnosFiltrados.push({
              id: alumno.id,
              email: alumno.email,
              nombre: alumno.nombre,
              created_at: alumno.created_at,
              curso_nombre: cursosMap[cursoId] || 'Curso sin nombre',
              curso_id: cursoId
            })
          })
        }
      })

      // Ordenar por nombre del alumno y luego por curso
      alumnosFiltrados.sort((a, b) => {
        const nombreA = a.nombre || a.email
        const nombreB = b.nombre || b.email
        if (nombreA === nombreB) {
          return (a.curso_nombre || '').localeCompare(b.curso_nombre || '')
        }
        return nombreA.localeCompare(nombreB)
      })

      setAlumnos(alumnosFiltrados)
      setAlumnosFiltrados(alumnosFiltrados)
    } catch (error) {
      console.error('Error cargando datos:', error)
      setToast({ message: 'Error al cargar los datos', type: 'error' })
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Cargando...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
      
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
                <h1 className="text-xl font-medium text-gray-900">{academia?.nombre || 'Academia'}</h1>
              </div>
            </div>
            <button
              onClick={() => router.push('/profesor')}
              className="text-gray-500 hover:text-gray-700"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <div className="w-64 min-h-screen bg-white border-r border-gray-200">
          <nav className="mt-5 px-2">
            <div className="space-y-1">
              <div 
                onClick={() => router.push('/profesor')}
                className="text-gray-600 hover:bg-gray-50 hover:text-gray-900 group flex items-center px-2 py-2 text-sm font-medium rounded-md cursor-pointer"
              >
                <span className="w-6 h-6 bg-blue-600 rounded text-white text-xs flex items-center justify-center mr-3">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                </span>
                Inicio
              </div>

              <div className="bg-green-50 text-green-700 group flex items-center px-2 py-2 text-sm font-medium rounded-md">
                <span className="w-6 h-6 bg-green-600 rounded text-white text-xs flex items-center justify-center mr-3">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 6.292 4 4 0 000-6.292zM15 21H3v-1a6 6 0 0112 0v1z" />
                  </svg>
                </span>
                Mis alumnos
              </div>

              <div className="mt-8">
                <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Mis Cursos
                </h3>
                <div className="mt-2 space-y-1">
                  {cursosProfesor.map((curso) => (
                    <div 
                      key={curso.id} 
                      onClick={() => router.push(`/asignatura/${curso.id}`)}
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
            {/* Tabs */}
            <div className="mb-6">
              <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8">
                  <button
                    onClick={() => setActiveTab('alumnos')}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      activeTab === 'alumnos'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Lista de Alumnos
                  </button>
                  <button
                    onClick={() => setActiveTab('analytics')}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      activeTab === 'analytics'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Estadísticas de Video
                  </button>
                </nav>
              </div>
            </div>

            {/* Contenido de las pestañas */}
            {activeTab === 'alumnos' ? (
              <>
                <div className="mb-6">
                  <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">Mis Alumnos</h2>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-sm text-gray-600">
                          Lista de alumnos matriculados en tus asignaturas ({alumnosFiltrados.length} {alumnosFiltrados.length === 1 ? 'alumno' : 'alumnos'})
                        </p>
                        {(busquedaTexto || cursoSeleccionado !== 'todos') && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            Filtros activos
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3">
                      {/* Buscador */}
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
                        </div>
                        <input
                          type="text"
                          placeholder="Buscar por nombre"
                          value={busquedaTexto}
                          onChange={(e) => setBusquedaTexto(e.target.value)}
                          className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        />
                      </div>
                      {/* Filtro por curso */}
                      {cursosDisponibles.length > 0 && (
                        <div className="flex items-center space-x-2">
                          <label htmlFor="curso-filter" className="text-sm font-medium text-gray-700 whitespace-nowrap">
                            Curso:
                          </label>
                          <select
                            id="curso-filter"
                            value={cursoSeleccionado}
                            onChange={(e) => setCursoSeleccionado(e.target.value)}
                            className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="todos">Todos</option>
                            {cursosDisponibles.map((curso) => (
                              <option key={curso.id} value={curso.id}>
                                {curso.nombre}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Estadísticas */}
                {alumnos.length > 0 && (
                  <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                      <div className="flex items-center">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 6.292 4 4 0 000-6.292zM15 21H3v-1a6 6 0 0112 0v1z" />
                          </svg>
                        </div>
                        <div className="ml-4">
                          <p className="text-sm font-medium text-gray-600">Total alumnos</p>
                          <p className="text-2xl font-bold text-gray-900">{new Set(alumnos.map(a => a.id)).size}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                      <div className="flex items-center">
                        <div className="p-2 bg-green-100 rounded-lg">
                          <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                          </svg>
                        </div>
                        <div className="ml-4">
                          <p className="text-sm font-medium text-gray-600">Cursos asignados</p>
                          <p className="text-2xl font-bold text-gray-900">{cursosDisponibles.length}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                      <div className="flex items-center">
                        <div className="p-2 bg-purple-100 rounded-lg">
                          <svg className="w-6 h-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                          </svg>
                        </div>
                        <div className="ml-4">
                          <p className="text-sm font-medium text-gray-600">Matrículas activas</p>
                          <p className="text-2xl font-bold text-gray-900">{alumnos.length}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {alumnosFiltrados.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="mx-auto h-24 w-24 text-gray-400">
                      <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 4.354a4 4 0 110 6.292 4 4 0 000-6.292zM15 21H3v-1a6 6 0 0112 0v1z" />
                      </svg>
                    </div>
                    <h3 className="mt-2 text-sm font-medium text-gray-900">
                      {(busquedaTexto || cursoSeleccionado !== 'todos') ? 'No se encontraron alumnos' : 'No hay alumnos'}
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                      {(busquedaTexto || cursoSeleccionado !== 'todos') 
                        ? 'Intenta ajustar los filtros de búsqueda' 
                        : 'Aún no tienes alumnos asignados a tus asignaturas'
                      }
                    </p>
                    {(busquedaTexto || cursoSeleccionado !== 'todos') && (
                      <div className="mt-4">
                        <button
                          onClick={() => {
                            setBusquedaTexto('')
                            setCursoSeleccionado('todos')
                          }}
                          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                          Limpiar filtros
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-white shadow-sm rounded-lg overflow-hidden">
                    <div className="px-4 py-5 sm:p-6">
                      <div className="grid grid-cols-1 gap-4">
                        {alumnosFiltrados.map((alumno, index) => (
                          <div
                            key={`${alumno.id}-${alumno.curso_id}-${index}`}
                            className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors duration-150"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-4">
                                <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                                  <span className="text-white font-medium text-sm">
                                    {(alumno.nombre || alumno.email).charAt(0).toUpperCase()}
                                  </span>
                                </div>
                                <div>
                                  <h3 className="text-sm font-medium text-gray-900">
                                    {alumno.nombre ? resaltarTexto(alumno.nombre, busquedaTexto) : 'Sin nombre'}
                                  </h3>
                                  <p className="text-sm text-gray-500">
                                    {resaltarTexto(alumno.email, busquedaTexto)}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-medium text-gray-900">
                                  {alumno.curso_nombre}
                                </p>
                                <p className="text-xs text-gray-500">
                                  Matriculado: {new Date(alumno.created_at).toLocaleDateString('es-ES')}
                                </p>
                              </div>
                              <div className="flex items-center">
                                <button
                                  onClick={() => window.open(`mailto:${alumno.email}?subject=Consulta sobre ${alumno.curso_nombre}`, '_blank')}
                                  className="text-blue-600 hover:text-blue-800 p-2 rounded-full hover:bg-blue-50 transition-colors"
                                  title="Enviar email"
                                >
                                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                  </svg>
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <VideoAnalyticsPanel cursosProfesor={cursosProfesor} />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
