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
}

interface StudentStat {
  userId: string
  userName: string
  userEmail: string
  totalSessions: number
  totalWatchTime: number
  completedSessions: number
  activeSessions: number
  lastActivity: string
  clasesVisualizadas: string[]
  uniqueClassesCount: number
}

interface ClassStat {
  contentId: string
  contentTitle: string
  totalViews: number
  totalWatchTime: number
  uniqueStudents: number
  averageWatchTime: number
}

interface AnalyticsSummary {
  totalSessions: number
  completedSessions: number
  activeSessions: number
  totalWatchTimeSeconds: number
  totalWatchTimeMinutes: number
  totalWatchTimeHours: number
  uniqueStudents: number
}

export default function ProfesorAnalyticsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [loadingState, setLoadingState] = useState<string>('Iniciando...')
  const [cursos, setCursos] = useState<Curso[]>([])
  const [selectedCurso, setSelectedCurso] = useState<string>('all')
  const [profesorId, setProfesorId] = useState<string | null>(null)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  
  // Estados para analytics
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null)
  const [studentStats, setStudentStats] = useState<StudentStat[]>([])
  const [classStats, setClassStats] = useState<ClassStat[]>([])
  const [analyticsLoading, setAnalyticsLoading] = useState(false)

  // Función para formatear tiempo
  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`
    } else {
      return `${secs}s`
    }
  }

  // Función para formatear fechas
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Cargar analytics
  const loadAnalytics = async () => {
    if (!profesorId) return

    setAnalyticsLoading(true)
    try {
      const url = new URL('/api/video/profesor-analytics', window.location.origin)
      url.searchParams.set('profesorId', profesorId)
      
      if (selectedCurso !== 'all') {
        url.searchParams.set('cursoId', selectedCurso)
      }

      const response = await fetch(url.toString())
      
      if (!response.ok) {
        throw new Error('Error cargando analytics')
      }

      const data = await response.json()
      
      setSummary(data.summary)
      setStudentStats(data.studentStats)
      setClassStats(data.classStats)
      
    } catch (error) {
      console.error('Error cargando analytics:', error)
      setToast({ message: 'Error cargando estadísticas', type: 'error' })
    } finally {
      setAnalyticsLoading(false)
    }
  }

  useEffect(() => {
    const init = async () => {
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

        setProfesorId(session.user.id)

        setLoadingState('Verificando permisos...')

        const { data: profile } = await supabase
          .from('profiles')
          .select('role, cursos_asignados, academia_id')
          .eq('id', session.user.id)
          .single()

        if (!profile || profile.role !== 'profesor') {
          setLoadingState('Sin acceso')
          setTimeout(() => {
            router.replace('/')
          }, 1500)
          return
        }

        setLoadingState('Cargando cursos...')

        // Cargar cursos del profesor
        if (profile.cursos_asignados && profile.cursos_asignados.length > 0) {
          const { data: cursosData } = await supabase
            .from('cursos')
            .select('id, nombre, universidad, curso_academico')
            .in('id', profile.cursos_asignados)
            .eq('academia_id', profile.academia_id)

          setCursos(cursosData || [])
        }

        setLoading(false)
        
      } catch (error) {
        console.error('Error inicializando:', error)
        setToast({ message: 'Error cargando página', type: 'error' })
        setLoading(false)
      }
    }

    init()
  }, [router])

  // Cargar analytics cuando cambien las dependencias
  useEffect(() => {
    if (profesorId && !loading) {
      loadAnalytics()
    }
  }, [profesorId, selectedCurso, loading])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">{loadingState}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-100 via-blue-50 to-cyan-25">
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
                onClick={() => router.push('/profesor')}
                className="mr-4 p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center">
                  <span className="text-white font-medium text-sm">
                    A
                  </span>
                </div>
              </div>
              <div className="ml-4">
                <h1 className="text-xl font-medium text-gray-900">Analytics de Visualización</h1>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-blue-900 font-medium">
                Analytics
              </span>
              <button
                onClick={async () => {
                  await supabase.auth.signOut();
                  router.push('/login');
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
        <div className="w-64 fixed left-0 top-16 bottom-0 backdrop-blur-md bg-white/80 shadow-md border-r border-white/30 overflow-y-auto">
          <nav className="mt-5 px-2">
            <div className="space-y-1">
              <div 
                onClick={() => router.push('/profesor')}
                className="group flex items-center px-2 py-2 text-sm font-medium rounded-lg cursor-pointer transition-all duration-150 bg-white/0 hover:bg-blue-100/80 text-blue-900 hover:text-blue-700 shadow-sm"
              >
                <span className="w-6 h-6 bg-blue-400 rounded text-blue-900 text-xs flex items-center justify-center mr-3">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                </span>
                Inicio
              </div>

              <div 
                onClick={() => router.push('/profesor/alumnos')}
                className="group flex items-center px-2 py-2 text-sm font-medium rounded-lg cursor-pointer transition-all duration-150 bg-white/0 hover:bg-blue-100/80 text-blue-900 hover:text-blue-700 shadow-sm"
              >
                <span className="w-6 h-6 bg-blue-200 rounded text-blue-900 text-xs flex items-center justify-center mr-3">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 6.292 4 4 0 000-6.292zM15 21H3v-1a6 6 0 0112 0v1z" />
                  </svg>
                </span>
                Mis alumnos
              </div>

              <div className="bg-gradient-to-r from-blue-100 to-blue-50 text-blue-900 group flex items-center px-2 py-2 text-sm font-semibold rounded-lg shadow-sm">
                <span className="w-6 h-6 bg-blue-400 rounded text-blue-900 text-xs flex items-center justify-center mr-3">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </span>
                Analytics
              </div>

              <div className="mt-8">
                <h3 className="px-3 text-xs font-semibold text-blue-700 uppercase tracking-wider my-3">
                  Mis Cursos
                </h3>
                <div className="mt-2 space-y-1">
                  {cursos.map((curso) => (
                    <div 
                      key={curso.id} 
                      onClick={() => router.push(`/profesor/curso/${curso.id}`)}
                      className="group flex items-center px-2 py-2 text-sm font-medium rounded-lg cursor-pointer transition-all duration-150 bg-white/0 hover:bg-blue-100/80 text-blue-900 hover:text-blue-700 shadow-sm"
                    >
                      <span className="w-6 h-6 bg-blue-200 rounded text-blue-900 text-xs flex items-center justify-center mr-3">
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

        {/* Main Content - Scrollable Area */}
        <div className="flex-1 ml-64 overflow-y-auto h-[calc(100vh-4rem)]">
          <div className="max-w-6xl mx-auto p-8">
        {/* Filtro por curso */}
        <div className="mb-8">
          <label htmlFor="curso-select" className="block text-sm font-medium text-gray-700 mb-2">
            Filtrar por curso:
          </label>
          <select
            id="curso-select"
            value={selectedCurso}
            onChange={(e) => setSelectedCurso(e.target.value)}
            className="w-64 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">Todos los cursos</option>
            {cursos.map((curso) => (
              <option key={curso.id} value={curso.id}>
                {curso.nombre}
              </option>
            ))}
          </select>
        </div>

        {analyticsLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-4 text-gray-600">Cargando estadísticas...</p>
          </div>
        ) : (
          <>
            {/* Resumen general */}
            {summary && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-white p-6 rounded-lg shadow">
                  <h3 className="text-sm font-medium text-gray-500">Total Sesiones</h3>
                  <p className="text-3xl font-bold text-blue-600">{summary.totalSessions}</p>
                </div>
                <div className="bg-white p-6 rounded-lg shadow">
                  <h3 className="text-sm font-medium text-gray-500">Estudiantes Únicos</h3>
                  <p className="text-3xl font-bold text-green-600">{summary.uniqueStudents}</p>
                </div>
                <div className="bg-white p-6 rounded-lg shadow">
                  <h3 className="text-sm font-medium text-gray-500">Tiempo Total</h3>
                  <p className="text-3xl font-bold text-purple-600">{summary.totalWatchTimeHours}h</p>
                  <p className="text-sm text-gray-500">{summary.totalWatchTimeMinutes} minutos</p>
                </div>
                <div className="bg-white p-6 rounded-lg shadow">
                  <h3 className="text-sm font-medium text-gray-500">Sesiones Activas</h3>
                  <p className="text-3xl font-bold text-yellow-600">{summary.activeSessions}</p>
                </div>
              </div>
            )}

            {/* Estadísticas por alumno */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Estadísticas por Alumno</h2>
              <div className="bg-white shadow rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Alumno
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Sesiones
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Tiempo Total
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Clases Vistas
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Última Actividad
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {studentStats.map((student) => (
                      <tr key={student.userId}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{student.userName}</div>
                            <div className="text-sm text-gray-500">{student.userEmail}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{student.totalSessions}</div>
                          {student.activeSessions > 0 && (
                            <div className="text-xs text-yellow-600">{student.activeSessions} activa(s)</div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{formatTime(student.totalWatchTime)}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{student.uniqueClassesCount} clases</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {student.lastActivity ? formatDate(student.lastActivity) : 'N/A'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {studentStats.length === 0 && (
                  <div className="p-8 text-center text-gray-500">
                    No hay datos de visualización disponibles
                  </div>
                )}
              </div>
            </div>

            {/* Estadísticas por clase */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Estadísticas por Clase</h2>
              <div className="bg-white shadow rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Clase
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Visualizaciones
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Estudiantes Únicos
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Tiempo Total
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Tiempo Promedio
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {classStats.map((classItem) => (
                      <tr key={classItem.contentId}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{classItem.contentTitle}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {classItem.totalViews}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {classItem.uniqueStudents}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatTime(classItem.totalWatchTime)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatTime(classItem.averageWatchTime)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {classStats.length === 0 && (
                  <div className="p-8 text-center text-gray-500">
                    No hay datos de clases disponibles
                  </div>
                )}
              </div>
            </div>
          </>
        )}
          </div>
        </div>
      </div>
    </div>
  )
}