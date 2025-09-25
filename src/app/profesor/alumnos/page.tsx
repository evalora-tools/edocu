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

interface Curso {
  id: string
  nombre: string
  universidad: string
  curso_academico: string
}

export default function ProfesorAlumnosPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [alumnos, setAlumnos] = useState<Alumno[]>([])
  const [cursos, setCursos] = useState<Curso[]>([])
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
        .select('id, nombre, universidad, curso_academico')
        .in('id', cursosAsignados)
        .eq('academia_id', academiaId)

      if (cursosError) {
        console.error('Error cargando cursos:', cursosError)
        return
      }

      setCursos(cursosData || [])

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
      <div className="min-h-screen bg-gradient-to-br from-sky-100 via-blue-50 to-cyan-25 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando alumnos...</p>
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
            <div className="flex items-center space-x-4">
              <span className="text-sm text-blue-900 font-medium">
                Mis Alumnos
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

              <div className="bg-gradient-to-r from-blue-100 to-blue-50 text-blue-900 group flex items-center px-2 py-2 text-sm font-semibold rounded-lg shadow-sm">
                <span className="w-6 h-6 bg-blue-400 rounded text-blue-900 text-xs flex items-center justify-center mr-3">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 6.292 4 4 0 000-6.292zM15 21H3v-1a6 6 0 0112 0v1z" />
                  </svg>
                </span>
                Mis alumnos
              </div>

              <div 
                onClick={() => router.push('/profesor/analytics')}
                className="group flex items-center px-2 py-2 text-sm font-medium rounded-lg cursor-pointer transition-all duration-150 bg-white/0 hover:bg-blue-100/80 text-blue-900 hover:text-blue-700 shadow-sm"
              >
                <span className="w-6 h-6 bg-blue-200 rounded text-blue-900 text-xs flex items-center justify-center mr-3">
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
            {/* Header Section */}
            <div className="mb-8">
              {/* Removed header content */}
            </div>
            
            {/* Search Section */}
            <div className="mb-6">
              <div className="relative max-w-sm">
                <input
                  type="text"
                  placeholder="Buscar..."
                  value={busquedaTexto}
                  onChange={(e) => setBusquedaTexto(e.target.value)}
                  className="block w-full px-4 py-2.5 border border-gray-200 rounded-lg bg-white text-sm placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400 transition-colors"
                />
              </div>
            </div>

            {/* Students List */}
            {alumnosFiltrados.length === 0 ? (
              <div className="bg-gray-50 rounded-lg p-12 text-center">
                <p className="text-gray-500 mb-4">
                  {busquedaTexto ? 'No se encontraron resultados' : 'No hay estudiantes'}
                </p>
                {busquedaTexto && (
                  <button
                    onClick={() => setBusquedaTexto('')}
                    className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                  >
                    Limpiar búsqueda
                  </button>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                {/* Table Header */}
                <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
                  <div className="grid grid-cols-12 gap-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <div className="col-span-4">Estudiante</div>
                    <div className="col-span-4">Curso</div>
                    <div className="col-span-3">Fecha matriculación</div>
                    <div className="col-span-1"></div>
                  </div>
                </div>
                
                {/* Table Body */}
                <div className="divide-y divide-gray-100">
                  {alumnosFiltrados.map((alumno, index) => (
                    <div
                      key={`${alumno.id}-${alumno.curso_id}-${index}`}
                      className="px-6 py-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="grid grid-cols-12 gap-4 items-center">
                        <div className="col-span-4">
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {alumno.nombre ? resaltarTexto(alumno.nombre, busquedaTexto) : 'Sin nombre'}
                            </p>
                            <p className="text-sm text-gray-500">
                              {resaltarTexto(alumno.email, busquedaTexto)}
                            </p>
                          </div>
                        </div>
                        <div className="col-span-4">
                          <p className="text-sm text-gray-900">{alumno.curso_nombre}</p>
                        </div>
                        <div className="col-span-3">
                          <p className="text-sm text-gray-500">
                            {new Date(alumno.created_at).toLocaleDateString('es-ES')}
                          </p>
                        </div>
                        <div className="col-span-1 text-right">
                          <button
                            onClick={() => window.open(`mailto:${alumno.email}?subject=Consulta sobre ${alumno.curso_nombre}`, '_blank')}
                            className="text-gray-400 hover:text-blue-600 transition-colors p-1"
                            title="Enviar email"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Footer with count */}
                <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
                  <p className="text-xs text-gray-500">
                    Mostrando {alumnosFiltrados.length} de {alumnos.length} estudiantes
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}