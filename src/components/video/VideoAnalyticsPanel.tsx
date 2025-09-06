'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Toast from '@/components/ui/Toast'

interface VideoAnalytics {
  alumno: {
    id: string
    nombre: string
    email: string
  }
  contenidos: Record<string, {
    id: string
    titulo: string
    curso_id: string
    curso_nombre: string
    tiempo_total_visualizado: number
    duracion_video: number
    porcentaje_promedio: number
    sesiones_count: number
    primera_sesion: string
    ultima_sesion: string
    eventos_totales: number
    sesiones: Array<{
      tiempo_visualizado: number
      porcentaje_completado: number
      tiempo_inicio: string
      tiempo_fin: string | null
      eventos: number
      ultimo_evento: string | null
    }>
  }>
  resumen: {
    tiempo_total_curso: number
    contenidos_vistos: number
    contenidos_completados: number
    porcentaje_progreso_curso: number
  }
}

interface Props {
  cursosProfesor: Array<{ id: string; nombre: string }>
}

export default function VideoAnalyticsPanel({ cursosProfesor }: Props) {
  const [analytics, setAnalytics] = useState<VideoAnalytics[]>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [cursoSeleccionado, setCursoSeleccionado] = useState<string>('todos')
  const [alumnoExpandido, setAlumnoExpandido] = useState<string | null>(null)
  const [contenidoExpandido, setContenidoExpandido] = useState<string | null>(null)

  useEffect(() => {
    fetchAnalytics()
  }, [cursoSeleccionado])

  const fetchAnalytics = async () => {
    try {
      setLoading(true)

      const params = new URLSearchParams()
      if (cursoSeleccionado !== 'todos') {
        params.append('courseId', cursoSeleccionado)
      }

      const response = await fetch(`/api/video/student-analytics?${params}`)

      if (!response.ok) {
        throw new Error('Error al cargar analytics')
      }

      const result = await response.json()
      console.log('Respuesta del API:', result)
      
      if (result.success) {
        console.log(`Datos recibidos: ${result.data.length} estudiantes`)
        setAnalytics(result.data)
      } else {
        throw new Error(result.error || 'Error desconocido')
      }
    } catch (error) {
      console.error('Error cargando analytics:', error)
      setToast({ message: 'Error al cargar las estadísticas', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const formatTime = (seconds: number): string => {
    if (seconds < 60) {
      return `${Math.round(seconds)}s`
    }
    
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = Math.round(seconds % 60)

    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`
    } else {
      return `${minutes}m ${secs}s`
    }
  }

  const formatDuration = (watched: number, total: number): string => {
    if (total === 0) return formatTime(watched)
    
    const percentage = (watched / total) * 100
    return `${formatTime(watched)} de ${formatTime(total)} (${percentage.toFixed(1)}%)`
  }

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getProgressColor = (percentage: number): string => {
    if (percentage >= 80) return 'bg-green-500'
    if (percentage >= 60) return 'bg-yellow-500'
    if (percentage >= 40) return 'bg-orange-500'
    return 'bg-red-500'
  }

  const getProgressColorText = (percentage: number): string => {
    if (percentage >= 80) return 'text-green-600'
    if (percentage >= 60) return 'text-yellow-600'
    if (percentage >= 40) return 'text-orange-600'
    return 'text-red-600'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-lg">Cargando estadísticas...</div>
      </div>
    )
  }

  if (analytics.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="mx-auto h-24 w-24 text-gray-400">
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <h3 className="mt-2 text-sm font-medium text-gray-900">No hay datos de visualización</h3>
        <p className="mt-1 text-sm text-gray-500">
          Los alumnos aún no han visualizado contenido en tus cursos
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Filtros */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">
          Estadísticas de Visualización
        </h3>
        <div className="flex items-center space-x-4">
          <label htmlFor="curso-analytics" className="text-sm font-medium text-gray-700">
            Filtrar por curso:
          </label>
          <select
            id="curso-analytics"
            value={cursoSeleccionado}
            onChange={(e) => setCursoSeleccionado(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="todos">Todos los cursos</option>
            {cursosProfesor.map((curso) => (
              <option key={curso.id} value={curso.id}>
                {curso.nombre}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Resumen general */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 6.292 4 4 0 000-6.292zM15 21H3v-1a6 6 0 0112 0v1z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Alumnos activos</p>
              <p className="text-2xl font-bold text-gray-900">{analytics.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h8m-9-4V7a3 3 0 116 0v3M5 12a2 2 0 104 0h4a2 2 0 104 0v-1a2 2 0 00-2-2H7a2 2 0 00-2 2v1z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Tiempo total</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatTime(analytics.reduce((total, a) => total + a.resumen.tiempo_total_curso, 0))}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <svg className="w-6 h-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Contenidos vistos</p>
              <p className="text-2xl font-bold text-gray-900">
                {analytics.reduce((total, a) => total + a.resumen.contenidos_vistos, 0)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <svg className="w-6 h-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Completados</p>
              <p className="text-2xl font-bold text-gray-900">
                {analytics.reduce((total, a) => total + a.resumen.contenidos_completados, 0)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Lista de alumnos */}
      <div className="space-y-4">
        {analytics.map((studentData) => (
          <div key={studentData.alumno.id} className="bg-white rounded-lg shadow-sm border border-gray-200">
            {/* Cabecera del alumno */}
            <div 
              className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => setAlumnoExpandido(
                alumnoExpandido === studentData.alumno.id ? null : studentData.alumno.id
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                    <span className="text-white font-medium text-sm">
                      {studentData.alumno.nombre.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <h4 className="text-lg font-medium text-gray-900">
                      {studentData.alumno.nombre}
                    </h4>
                    <p className="text-sm text-gray-500">{studentData.alumno.email}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-6">
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">
                      {formatTime(studentData.resumen.tiempo_total_curso)}
                    </p>
                    <p className="text-xs text-gray-500">Tiempo total</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-medium ${getProgressColorText(studentData.resumen.porcentaje_progreso_curso)}`}>
                      {studentData.resumen.porcentaje_progreso_curso.toFixed(1)}%
                    </p>
                    <p className="text-xs text-gray-500">Progreso</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">
                      {studentData.resumen.contenidos_vistos}
                    </p>
                    <p className="text-xs text-gray-500">Contenidos</p>
                  </div>
                  <svg 
                    className={`w-5 h-5 text-gray-400 transition-transform ${
                      alumnoExpandido === studentData.alumno.id ? 'rotate-180' : ''
                    }`} 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Contenidos del alumno (expandible) */}
            {alumnoExpandido === studentData.alumno.id && (
              <div className="px-4 pb-4 border-t border-gray-200">
                <div className="pt-4 space-y-3">
                  {Object.values(studentData.contenidos).map((contenido) => (
                    <div key={contenido.id} className="bg-gray-50 rounded-lg p-3">
                      <div 
                        className="cursor-pointer"
                        onClick={() => setContenidoExpandido(
                          contenidoExpandido === `${studentData.alumno.id}-${contenido.id}` 
                            ? null 
                            : `${studentData.alumno.id}-${contenido.id}`
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h5 className="font-medium text-gray-900">{contenido.titulo}</h5>
                            <p className="text-sm text-gray-500">{contenido.curso_nombre}</p>
                          </div>
                          <div className="flex items-center space-x-4">
                            <div className="text-right">
                              <p className="text-sm font-medium text-gray-900">
                                {formatDuration(contenido.tiempo_total_visualizado, contenido.duracion_video)}
                              </p>
                              <p className="text-xs text-gray-500">
                                {contenido.sesiones_count} {contenido.sesiones_count === 1 ? 'sesión' : 'sesiones'}
                              </p>
                            </div>
                            <div className="w-24">
                              <div className="flex items-center space-x-2">
                                <div className="flex-1 bg-gray-200 rounded-full h-2">
                                  <div 
                                    className={`h-2 rounded-full ${getProgressColor(contenido.porcentaje_promedio)}`}
                                    style={{ width: `${Math.min(100, contenido.porcentaje_promedio)}%` }}
                                  />
                                </div>
                                <span className={`text-xs font-medium ${getProgressColorText(contenido.porcentaje_promedio)}`}>
                                  {contenido.porcentaje_promedio.toFixed(0)}%
                                </span>
                              </div>
                            </div>
                            <svg 
                              className={`w-4 h-4 text-gray-400 transition-transform ${
                                contenidoExpandido === `${studentData.alumno.id}-${contenido.id}` ? 'rotate-180' : ''
                              }`} 
                              fill="none" 
                              viewBox="0 0 24 24" 
                              stroke="currentColor"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                        </div>
                      </div>

                      {/* Sesiones detalladas */}
                      {contenidoExpandido === `${studentData.alumno.id}-${contenido.id}` && (
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <h6 className="text-sm font-medium text-gray-700 mb-2">
                            Sesiones de visualización ({contenido.sesiones_count})
                          </h6>
                          <div className="space-y-2">
                            {contenido.sesiones.map((sesion, index) => (
                              <div key={index} className="bg-white rounded p-3 text-sm border border-gray-100">
                                <div className="flex items-center justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center space-x-3">
                                      <span className="font-medium text-gray-900">
                                        {formatTime(sesion.tiempo_visualizado)}
                                      </span>
                                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                        sesion.porcentaje_completado >= 80 
                                          ? 'bg-green-100 text-green-800' 
                                          : sesion.porcentaje_completado >= 50
                                          ? 'bg-yellow-100 text-yellow-800'
                                          : 'bg-red-100 text-red-800'
                                      }`}>
                                        {sesion.porcentaje_completado.toFixed(1)}% visto
                                      </span>
                                      {sesion.eventos > 0 && (
                                        <span className="text-xs text-gray-500">
                                          {sesion.eventos} eventos
                                        </span>
                                      )}
                                    </div>
                                    <div className="mt-1 text-xs text-gray-600">
                                      <span>Inicio: {formatDate(sesion.tiempo_inicio)}</span>
                                      {sesion.tiempo_fin && (
                                        <span className="ml-3">Fin: {formatDate(sesion.tiempo_fin)}</span>
                                      )}
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    {!sesion.tiempo_fin && (
                                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                        Activa
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
