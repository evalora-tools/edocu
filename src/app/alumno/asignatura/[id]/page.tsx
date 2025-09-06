'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Toast from '@/components/ui/Toast'
import VdoCipherPlayer from '@/components/video/VdoCipherPlayer'

interface Curso {
  id: string;
  nombre: string;
  universidad: string;
  curso_academico: string;
}

interface Seccion {
  id: string
  titulo: string
  orden: number
  curso_id: string
  created_at: string
}

interface Academia {
  id: string;
  nombre: string;
}

interface Contenido {
  id: string;
  tipo: 'apunte' | 'problema' | 'clase';
  titulo: string;
  descripcion?: string;
  archivo_url?: string;
  curso_id: string;
  fecha?: string;
  duracion?: string;
  orden: number;
  estado_procesamiento?: 'processing' | 'ready' | 'failed';
  seccion_id?: string | null;
  created_at?: string;
}

export default function AsignaturaAlumnoPage({ params }: { params: { id: string } }) {
  const [secciones, setSecciones] = useState<Seccion[]>([])
  const [openSecciones, setOpenSecciones] = useState<{ [id: string]: boolean }>({})

  // Abrir todas las secciones por defecto cuando cambian
  useEffect(() => {
    if (secciones.length > 0) {
      setOpenSecciones(prev => {
        const newState = { ...prev };
        secciones.forEach(s => { newState[s.id] = true; });
        return newState;
      });
    }
  }, [secciones]);
  const router = useRouter()
  const [curso, setCurso] = useState<Curso | null>(null)
  const [academia, setAcademia] = useState<Academia | null>(null)
  const [cursos, setCursos] = useState<Curso[]>([])
  const [contenidos, setContenidos] = useState<{
    apuntes: Contenido[]
    problemas: Contenido[]
    clases: Contenido[]
  }>({ apuntes: [], problemas: [], clases: [] })
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [playerData, setPlayerData] = useState<{ otp: string; playbackInfo: string } | null>(null)
  const [showPlayerModal, setShowPlayerModal] = useState(false)
  const [isOpening, setIsOpening] = useState(false)
  const [selectedContent, setSelectedContent] = useState<Contenido | null>(null)


  const formatSeconds = (s?: string) => {
    const n = Number(s)
    if (!isFinite(n) || n <= 0) return undefined
    const hours = Math.floor(n / 3600)
    const minutes = Math.floor((n % 3600) / 60)
    const seconds = Math.floor(n % 60)
    if (hours > 0) {
      return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
    }
    return `${minutes}:${String(seconds).padStart(2, '0')}`
  }

  const abrirReproductor = async (videoId: string, contenido: Contenido) => {
    try {
      setIsOpening(true)
      const res = await fetch(`/api/admin/clases/otp/${videoId}`, { cache: 'no-store' })
      if (!res.ok) throw new Error('Error obteniendo OTP')
      const data = await res.json()
      setPlayerData({ otp: data.otp, playbackInfo: data.playbackInfo })
      setSelectedContent(contenido)
      setShowPlayerModal(true)
    } catch (e) {
      console.error('No se pudo abrir el reproductor', e)
      setToast({ message: 'No se pudo abrir el reproductor', type: 'error' })
    } finally {
      setIsOpening(false)
    }
  }

  const closePlayerModal = () => {
    setShowPlayerModal(false)
    setPlayerData(null)
    setSelectedContent(null)
  }

  const handleSuspiciousActivity = (reason: string) => {
    setToast({ 
      message: `Actividad sospechosa detectada: ${reason}. Tu cuenta puede estar siendo usada desde múltiples dispositivos.`, 
      type: 'error' 
    })
    closePlayerModal()
  }

  const openContent = (item: Contenido) => {
    if (!item.archivo_url) return
    if (item.tipo === 'clase') {
      if (!isOpening) abrirReproductor(item.archivo_url, item)
    } else {
      const newWindow = window.open(item.archivo_url, '_blank')
      if (newWindow) {
        newWindow.opener = null
      }
      setLoading(true)
      window.location.reload()
    }
  }

  useEffect(() => {
    const init = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          setLoading(false)
          router.replace('/login')
          return
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('role, cursos_adquiridos, academia_id')
          .eq('id', session.user.id)
          .single()

        if (!profile || profile.role !== 'alumno') {
          setLoading(false)
          router.replace('/')
          return
        }

        if (!profile.cursos_adquiridos?.includes(params.id)) {
          setLoading(false)
          router.replace('/alumno')
          return
        }

        const { data: cursoData, error: cursoError } = await supabase
          .from('cursos')
          .select('id, nombre, universidad, curso_academico')
          .eq('id', params.id)
          .eq('academia_id', profile.academia_id)
          .single()

        if (cursoError || !cursoData) {
          setLoading(false)
          router.replace('/alumno')
          return
        }

        setCurso(cursoData)

        // Cargar información de la academia
        const { data: academiaData, error: academiaError } = await supabase
          .from('academias')
          .select('id, nombre')
          .eq('id', profile.academia_id)
          .single()

        if (academiaError) {
          console.error('Error cargando academia:', academiaError)
        } else {
          setAcademia(academiaData)
        }

        // Cargar todos los cursos del alumno para el sidebar
        const cursosIds: string[] = profile.cursos_adquiridos || []
        if (cursosIds.length > 0) {
          const { data: cursosData, error: cursosError } = await supabase
            .from('cursos')
            .select('id, nombre, universidad, curso_academico')
            .in('id', cursosIds)
            .eq('academia_id', profile.academia_id)
            .order('created_at', { ascending: false })

          if (cursosError) {
            console.error('Error cargando cursos del alumno:', cursosError)
          } else {
            setCursos(cursosData || [])
          }
        }


        // Cargar secciones del curso
        const { data: seccionesData } = await supabase
          .from('secciones')
          .select('*')
          .eq('curso_id', params.id)
          .order('orden', { ascending: true })
        setSecciones(seccionesData || [])

        const { data: contenidosData } = await supabase
          .from('contenidos')
          .select('*')
          .eq('curso_id', params.id)
          .order('orden', { ascending: true })

        if (contenidosData) {
          setContenidos({
            apuntes: contenidosData.filter(c => c.tipo === 'apunte'),
            problemas: contenidosData.filter(c => c.tipo === 'problema'),
            clases: contenidosData.filter(c => c.tipo === 'clase')
          })
        }

        setLoading(false)
      } catch (error) {
        console.error('Error:', error)
        setLoading(false)
        router.replace('/login')
      }
    }

    init()
  }, [router, params.id])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-8 flex items-center gap-4 border border-white/30">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <div className="text-lg font-medium text-gray-700">Cargando curso...</div>
        </div>
      </div>
    )
  }

  if (!curso) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-8 text-center border border-white/30 max-w-md">
          <div className="text-xl font-semibold text-gray-800 mb-2">Curso no encontrado</div>
          <div className="text-gray-600 mb-6">Este curso no existe o no tienes acceso a él</div>
          <button
            onClick={() => router.push('/alumno')}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
          >
            Volver a mis cursos
          </button>
        </div>
      </div>
    )
  }

  const clasesDisponibles = contenidos.clases
    .filter(c => c.archivo_url)
    .filter(c => (c.estado_procesamiento ? c.estado_procesamiento === 'ready' : true))

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Navigation Header - Fixed */}
      <div className="bg-white border-b border-gray-200 fixed top-0 left-0 right-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <button
                onClick={() => window.location.href = '/alumno'}
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
            <div className="flex items-center">
              <div className="mr-4">
                <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center">
                  <span className="text-white font-medium text-sm">
                    {curso.nombre.charAt(0).toUpperCase()}
                  </span>
                </div>
              </div>
              <div>
                <h2 className="text-lg font-medium text-gray-900">{curso.nombre}</h2>
                <p className="text-sm text-gray-500">{curso.universidad}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex pt-16"> {/* Added padding-top to account for fixed header */}
        {/* Sidebar - Fixed */}
        <div className="w-64 fixed left-0 top-16 bottom-0 bg-white border-r border-gray-200 overflow-y-auto">
          <nav className="mt-5 px-2">
            <div className="space-y-1">
              <div 
                onClick={() => router.push('/alumno')}
                className="text-gray-600 hover:bg-gray-50 hover:text-gray-900 group flex items-center px-2 py-2 text-sm font-medium rounded-md cursor-pointer"
              >
                <span className="w-6 h-6 bg-gray-400 rounded text-white text-xs flex items-center justify-center mr-3">
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
                  {cursos.map((cursoItem) => (
                    <div 
                      key={cursoItem.id} 
                      onClick={() => router.push(`/alumno/asignatura/${cursoItem.id}`)}
                      className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md cursor-pointer ${
                        cursoItem.id === params.id 
                          ? 'bg-blue-50 text-blue-700' 
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                    >
                      <span className={`w-6 h-6 rounded text-white text-xs flex items-center justify-center mr-3 ${
                        cursoItem.id === params.id ? 'bg-blue-600' : 'bg-gray-400'
                      }`}>
                        {cursoItem.nombre.charAt(0).toUpperCase()}
                      </span>
                      <span className="truncate">{cursoItem.nombre}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </nav>
        </div>

        {/* Main Content - Scrollable Area */}
        <div className="flex-1 ml-64 overflow-y-auto h-[calc(100vh-4rem)]"> {/* height: 100vh - header height */}
          {/* Course Header - Card Style igual que profesor, con más separación */}
          <div className="max-w-6xl mx-auto px-6 pt-8">
      <div 
  className="relative rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 px-16 mb-5 shadow-md flex flex-col items-start justify-start"
  style={{ minHeight: '250px', paddingTop: '2.7rem', paddingBottom: '2.7rem' }}
      >
  <h1 className="text-4xl font-semibold text-white mb-1 pl-0 mt-0">{curso.nombre}</h1>
        <p className="text-xl text-blue-100 text-left pl-1">
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
        </p>
        <span className="absolute right-8 bottom-3 text-xs text-blue-200 select-none pointer-events-none">
          Todos los archivos están protegidos y sus derechos reservados ©
        </span>
      </div>
          </div>

          {/* Content Area */}
          <div className="p-6 bg-gray-50">
            <div className="max-w-5xl mx-auto px-0">
              <h2 className="text-2xl font-semibold text-gray-800 mb-8">Contenidos de la asignatura</h2>
              
              {/* Secciones y contenidos */}
              {secciones.map(seccion => {
                const contenidosSeccion = [...contenidos.apuntes, ...contenidos.problemas, ...contenidos.clases].filter(c => c.seccion_id === seccion.id)
                if (contenidosSeccion.length === 0) return null
                return (
                  <div key={seccion.id} className="mb-8">
                    <div className="flex items-center justify-between mb-6 cursor-pointer select-none" onClick={() => setOpenSecciones(prev => ({ ...prev, [seccion.id]: !prev[seccion.id] }))}>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          aria-label={openSecciones[seccion.id] ? 'Colapsar sección' : 'Expandir sección'}
                          className="focus:outline-none"
                          tabIndex={-1}
                        >
                          <svg className={`w-5 h-5 transition-transform duration-200 ${openSecciones[seccion.id] ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                        <h2 className="text-2xl font-normal text-gray-900">{seccion.titulo}</h2>
                      </div>
                    </div>
                    {openSecciones[seccion.id] && (
                      <div className="space-y-2">
                        {contenidosSeccion.map(item => (
                          <div
                            key={item.id}
                            onClick={() => openContent(item)}
                            className="bg-white rounded-lg border border-gray-200 hover:shadow-md cursor-pointer transition-all duration-200"
                          >
                            <div className="flex items-center p-4">
                              <div className="flex-shrink-0 mr-4">
                                <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                                  {/* Icono según tipo */}
                                  {item.tipo === 'clase' ? (
                                    <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                    </svg>
                                  ) : item.tipo === 'apunte' ? (
                                    <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6c-2.28-1.2-4.72-2-7-2v14c2.28 0 4.72.8 7 2m0-14c2.28-1.2 4.72-2 7-2v14c-2.28 0-4.72.8-7 2m0-14v14" />
                                    </svg>
                                  ) : (
                                    <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                  )}
                                </div>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <h3 className="text-sm font-medium text-gray-900 mb-1">
                                      {item.titulo}
                                    </h3>
                                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                                      {item.tipo === 'clase' && item.duracion && (
                                        <span>{formatSeconds(item.duracion)}</span>
                                      )}
                                      <span>
                                        Publicado: {item.fecha ? new Date(item.fecha).toLocaleDateString() : item.created_at ? new Date(item.created_at).toLocaleDateString() : 'Sin fecha'}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}

              {/* Contenidos sin sección */}
              {(() => {
                const sinSeccion = [...contenidos.apuntes, ...contenidos.problemas, ...contenidos.clases].filter(c => !c.seccion_id)
                if (sinSeccion.length === 0) return null
                return (
                  <div className="mb-8">
                    <div className="space-y-2">
                      {sinSeccion.map(item => (
                        <div
                          key={item.id}
                          onClick={() => openContent(item)}
                          className="bg-white rounded-lg border border-gray-200 hover:shadow-md cursor-pointer transition-all duration-200"
                        >
                          <div className="flex items-center p-4">
                            <div className="flex-shrink-0 mr-4">
                              <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                                {/* Icono según tipo */}
                                {item.tipo === 'clase' ? (
                                  <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                  </svg>
                                ) : item.tipo === 'apunte' ? (
                                  <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6c-2.28-1.2-4.72-2-7-2v14c2.28 0 4.72.8 7 2m0-14c2.28-1.2 4.72-2 7-2v14c-2.28 0-4.72.8-7 2m0-14v14" />
                                  </svg>
                                ) : (
                                  <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                  </svg>
                                )}
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <div>
                                  <h3 className="text-sm font-medium text-gray-900 mb-1">
                                    {item.titulo}
                                  </h3>
                                  <div className="flex items-center space-x-4 text-xs text-gray-500">
                                    {item.tipo === 'clase' && item.duracion && (
                                      <span>{formatSeconds(item.duracion)}</span>
                                    )}
                                    <span>Publicado: hoy</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })()}

              {/* Problemas Section */}
              {contenidos.problemas.length > 0 && (
                <div className="mb-12">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-normal text-gray-900">
                      PROBLEMAS
                    </h2>
                    <button className="text-gray-400 hover:text-gray-600">
                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z"/>
                      </svg>
                    </button>
                  </div>

                  <div className="space-y-3">
                    {contenidos.problemas.map(problema => (
                      <div
                        key={problema.id}
                        onClick={() => openContent(problema)}
                        className="bg-white rounded-lg border border-gray-200 hover:shadow-md cursor-pointer transition-all duration-200"
                      >
                        <div className="flex items-center p-4">
                          <div className="flex-shrink-0 mr-4">
                            <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                              <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <div>
                                <h3 className="text-sm font-medium text-gray-900 mb-1">
                                  {problema.titulo}
                                </h3>
                                <div className="flex items-center space-x-4 text-xs text-gray-500">
                                  <span>Publicado: hoy</span>
                                </div>
                              </div>
                              <button className="text-gray-400 hover:text-gray-600 ml-4">
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                  <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z"/>
                                </svg>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Apuntes Section ELIMINADA: ahora solo secciones creadas por el profesor y sin sección */}

              {/* Mensaje cuando no hay contenido */}
              {contenidos.apuntes.length === 0 && contenidos.problemas.length === 0 && clasesDisponibles.length === 0 && (
                <div className="text-center py-16">
                  <div className="bg-white rounded-lg border border-gray-200 p-12 max-w-md mx-auto">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No hay contenido disponible</h3>
                    <p className="text-gray-500">Aún no se ha añadido contenido a este curso.</p>
                    <p className="text-sm text-gray-400 mt-2">El profesor estará subiendo material próximamente.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal Reproductor con Tracking */}
      {showPlayerModal && playerData && selectedContent && (
        <VdoCipherPlayer
          otp={playerData.otp}
          playbackInfo={playerData.playbackInfo}
          contenidoId={selectedContent.id}
          titulo={selectedContent.titulo}
          duracion={selectedContent.duracion ? parseInt(selectedContent.duracion) : undefined}
          onClose={closePlayerModal}
          onSuspiciousActivity={handleSuspiciousActivity}
        />
      )}
    </div>
  )
}