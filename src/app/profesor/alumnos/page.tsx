'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Toast from '@/components/ui/Toast'

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
  const [busquedaTexto, setBusquedaTexto] = useState<string>('')
  const [academia, setAcademia] = useState<Academia | null>(null)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  // Filtrar alumnos basado en búsqueda
  const alumnosFiltrados = alumnos.filter(alumno => {
    if (!busquedaTexto.trim()) return true
    const nombre = (alumno.nombre || '').toLowerCase()
    const email = alumno.email.toLowerCase()
    const texto = busquedaTexto.toLowerCase().trim()
    return nombre.includes(texto) || email.includes(texto)
  })

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

  // Función para resaltar texto en la búsqueda
  const resaltarTexto = (texto: string, busqueda: string) => {
    if (!busqueda.trim()) return texto
    const regex = new RegExp(`(${busqueda.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
    const partes = texto.split(regex)
    return partes.map((parte, index) =>
      regex.test(parte) ? (
        <mark key={index} className="bg-yellow-200 px-1 rounded">{parte}</mark>
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

      {/* Main Content */}
      <div className="max-w-4xl mx-auto py-8 px-4">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Mis Alumnos</h2>
        
        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative w-full sm:w-80">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Buscar por nombre o email"
              value={busquedaTexto}
              onChange={(e) => setBusquedaTexto(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
          </div>
        </div>

        {/* Stats Card */}
        <div className="mb-6">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 6.292 4 4 0 000-6.292zM15 21H3v-1a6 6 0 0112 0v1z" />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Matrículas activas
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {alumnos.length}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Students List */}
        {alumnosFiltrados.length === 0 ? (
          <div className="text-center py-12">
            <div className="mx-auto h-24 w-24 text-gray-400">
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 4.354a4 4 0 110 6.292 4 4 0 000-6.292zM15 21H3v-1a6 6 0 0112 0v1z" />
              </svg>
            </div>
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              {busquedaTexto ? 'No se encontraron alumnos' : 'No hay alumnos'}
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {busquedaTexto 
                ? 'Intenta ajustar el filtro de búsqueda' 
                : 'Aún no tienes alumnos asignados a tus asignaturas'}
            </p>
            {busquedaTexto && (
              <div className="mt-4">
                <button
                  onClick={() => setBusquedaTexto('')}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Limpiar filtro
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
      </div>
    </div>
  )
}