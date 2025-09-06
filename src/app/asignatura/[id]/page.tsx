'use client'

import React, { useEffect, useState, useRef } from 'react'
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

interface Contenido {
  id: string
  tipo: 'apunte' | 'problema' | 'clase'
  titulo: string
  descripcion?: string
  archivo_url?: string
  curso_id: string
  fecha?: string
  duracion?: string
  orden: number
  estado_procesamiento?: 'processing' | 'ready' | 'failed'
}

export default function AsignaturaPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [curso, setCurso] = useState<Curso | null>(null)
  const [contenidos, setContenidos] = useState<{
    apuntes: Contenido[]
    problemas: Contenido[]
    clases: Contenido[]
  }>({
    apuntes: [],
    problemas: [],
    clases: []
  })
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [showNewContenidoModal, setShowNewContenidoModal] = useState(false)
  const [tipoContenidoSeleccionado, setTipoContenidoSeleccionado] = useState<'apunte' | 'problema' | 'clase'>('apunte')
  const [formData, setFormData] = useState({
    titulo: '',
    descripcion: '',
    tipo: 'apunte' as 'apunte' | 'problema' | 'clase',
    fecha: '',
    duracion: '',
    archivo_url: '',
    archivo: null as File | null,
    estado: '',
    poster: '',
    length: 0
  })
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [editContenidoId, setEditContenidoId] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [playerData, setPlayerData] = useState<{ otp: string; playbackInfo: string } | null>(null)
  const [showPlayerModal, setShowPlayerModal] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          router.replace('/login')
          return
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('role, cursos_asignados')
          .eq('id', session.user.id)
          .single()

        if (!profile || profile.role !== 'profesor' || !profile.cursos_asignados?.includes(params.id)) {
          router.replace('/')
          return
        }

        // Obtener información del curso
        const { data: cursoData, error: cursoError } = await supabase
          .from('cursos')
          .select('*')
          .eq('id', params.id)
          .single()

        if (cursoError) throw cursoError
        setCurso(cursoData)

        // Obtener todos los contenidos del curso
        try {
          const { data: contenidosData, error: contenidosError } = await supabase
            .from('contenidos')
            .select('*')
            .eq('curso_id', params.id)
            .order('orden', { ascending: true })

          if (contenidosError) {
            console.error('Error al cargar contenidos:', contenidosError)
            // Inicializar con arrays vacíos si hay error
            setContenidos({
              apuntes: [],
              problemas: [],
              clases: []
            })
          } else {
            // Organizar contenidos por tipo
            const contenidosOrganizados = {
              apuntes: contenidosData?.filter(c => c.tipo === 'apunte') || [],
              problemas: contenidosData?.filter(c => c.tipo === 'problema') || [],
              clases: contenidosData?.filter(c => c.tipo === 'clase') || []
            }
            setContenidos(contenidosOrganizados)
          }
        } catch (error) {
          console.error('Error al cargar contenidos:', error)
          // Inicializar con arrays vacíos si hay error
          setContenidos({
            apuntes: [],
            problemas: [],
            clases: []
          })
        }
      } catch (error) {
        console.error('Error:', error)
        setToast({
          message: 'Error al cargar los datos del curso',
          type: 'error'
        })
        router.replace('/login')
      }
    }

    fetchData()
  }, [router, params.id])

  const recargarContenidos = async () => {
    const { data: contenidosData } = await supabase
      .from('contenidos')
      .select('*')
      .eq('curso_id', params.id)
      .order('orden', { ascending: true });
    const contenidosOrganizados = {
      apuntes: contenidosData?.filter(c => c.tipo === 'apunte') || [],
      problemas: contenidosData?.filter(c => c.tipo === 'problema') || [],
      clases: contenidosData?.filter(c => c.tipo === 'clase') || []
    };
    setContenidos(contenidosOrganizados);
  };

  const resetFormulario = () => {
    setFormData({
      titulo: '',
      descripcion: '',
      tipo: 'apunte',
      fecha: '',
      duracion: '',
      archivo_url: '',
      archivo: null,
      estado: '',
      poster: '',
      length: 0
    });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Función para eliminar contenido
  const handleDeleteContenido = async (contenido: Contenido) => {
    if (!window.confirm('¿Seguro que quieres eliminar este contenido?')) return;
    try {
      // Eliminar archivo del storage si existe
      if (contenido.archivo_url) {
        // Extraer la ruta relativa del archivo
        const urlParts = contenido.archivo_url.split('/');
        const idx = urlParts.findIndex(part => part === 'contenidos');
        const filePath = urlParts.slice(idx + 1).join('/');
        await supabase.storage.from('contenidos').remove([filePath]);
      }
      // Eliminar de la base de datos
      const { error } = await supabase.from('contenidos').delete().eq('id', contenido.id);
      if (error) throw error;
      // Recargar contenidos
      await recargarContenidos();
      resetFormulario();
      setShowNewContenidoModal(false);
      setToast({ message: 'Contenido eliminado correctamente', type: 'success' });
    } catch (error) {
      setToast({ message: 'Error al eliminar el contenido', type: 'error' });
    }
  };

  // Función para editar contenido
  const handleEditContenido = (contenido: Contenido) => {
    setFormData({
      titulo: contenido.titulo,
      descripcion: contenido.descripcion || '',
      tipo: contenido.tipo,
      fecha: contenido.fecha || '',
      duracion: contenido.duracion || '',
      archivo_url: contenido.archivo_url || '',
      archivo: null,
      estado: '',
      poster: '',
      length: 0
    });
    setEditContenidoId(contenido.id);
    setTipoContenidoSeleccionado(contenido.tipo);
    setShowNewContenidoModal(true);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const N8N_VDOCIPHER_WEBHOOK = 'https://primary-production-e35d6.up.railway.app/webhook-test/vdocipher-uploadlink';
  // Añade la variable de entorno para la API Key de VdoCipher
  const VDO_API_KEY = process.env.NEXT_PUBLIC_VDO_API_KEY;

  // Función para verificar status
  const checkVideoStatus = async (videoId: string) => {
    try {
      const response = await fetch(`/api/admin/clases/status/${videoId}?t=${Date.now()}`, { cache: 'no-store' });
      if (!response.ok) throw new Error('Error checking status');
      
      const data = await response.json();
      console.log('Video status:', data);
      return data;
    } catch (error) {
      console.error('Error:', error);
      return null;
    }
  };

  // Función para hacer polling hasta que esté ready
  const waitForVideoReady = async (videoId: string, maxAttempts = 30) => {
    for (let i = 0; i < maxAttempts; i++) {
      const status = await checkVideoStatus(videoId);
      
      if (!status) return null;
      
      const current = String(status.status || '').toLowerCase();
      console.log(`Intento ${i + 1}: Status = ${status.status}`);
      
      if (current === 'ready') {
        return status; // Video listo
      }
      
      if (current === 'failed' || current === 'error') {
        throw new Error('Video processing failed');
      }
      
      // Esperar 10 segundos antes del siguiente check
      await new Promise(resolve => setTimeout(resolve, 10000));
    }
    
    throw new Error('Video processing timeout');
  };

  // Función para obtener el badge de estado con animación
  const getStatusBadge = (status: 'processing' | 'ready' | 'failed') => {
    const statusConfig = {
      'processing': { 
        color: 'yellow', 
        text: 'Procesando...', 
        className: 'bg-yellow-100 text-yellow-800 animate-pulse',
        icon: '🔄'
      },
      'ready': { 
        color: 'green', 
        text: 'Listo', 
        className: 'bg-green-100 text-green-800',
        icon: '✅'
      },
      'failed': { 
        color: 'red', 
        text: 'Error', 
        className: 'bg-red-100 text-red-800',
        icon: '❌'
      }
    };
    
    const config = statusConfig[status] || { 
      color: 'gray', 
      text: 'Desconocido', 
      className: 'bg-gray-100 text-gray-800',
      icon: '❓'
    };
    
    return (
      <span className={`px-2 py-1 text-xs rounded font-medium inline-flex items-center gap-1 ${config.className}`}>
        <span>{config.icon}</span>
        {config.text}
      </span>
    );
  };

  // Polling global de clases en procesamiento - mejorado para respuesta rápida
  useEffect(() => {
    let isCancelled = false;
    let timeoutId: NodeJS.Timeout;

    const checkAllProcessingVideos = async () => {
      if (isCancelled) return;

      const processingClases = contenidos.clases.filter(
        (c) => c.archivo_url && c.estado_procesamiento === 'processing'
      );

      console.log(`🔄 Checking ${processingClases.length} processing videos...`);

      let hasUpdates = false;

      for (const clase of processingClases) {
        try {
          const res = await fetch(`/api/admin/clases/status/${clase.archivo_url}?t=${Date.now()}`, { cache: 'no-store' });
          if (!res.ok) continue;
          const statusData = await res.json();
          const current = String(statusData.status || '').toLowerCase();
          
          console.log(`📹 Video ${clase.archivo_url}: ${statusData.status}`);
          
          let newStatus = 'processing';
          if (current === 'ready') {
            newStatus = 'ready';
          } else if (current === 'failed' || current === 'error') {
            newStatus = 'failed';
          }

          // Solo actualizar si hay cambio de estado
          if (newStatus !== clase.estado_procesamiento) {
            console.log(`✅ Updating video ${clase.archivo_url} from ${clase.estado_procesamiento} to ${newStatus}`);
            
            await fetch('/api/admin/contenidos/update-by-video', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                archivo_url: clase.archivo_url,
                estado_procesamiento: newStatus,
                duracion: statusData.length ? String(statusData.length) : null,
              }),
            });
            hasUpdates = true;

            // Mostrar notificación cuando el video esté listo o falle
            if (newStatus === 'ready') {
              setToast({ message: `✅ Video "${clase.titulo}" procesado correctamente`, type: 'success' });
            } else if (newStatus === 'failed') {
              setToast({ message: `❌ Error procesando video "${clase.titulo}"`, type: 'error' });
            }
          }
        } catch (e) {
          console.error('Error polling video status:', e);
        }
      }

      // Solo recargar contenidos si hubo actualizaciones
      if (!isCancelled && hasUpdates) {
        console.log('🔄 Reloading content due to status updates...');
        await recargarContenidos();
      }

      // Programar siguiente check - más frecuente si hay videos procesando
      if (!isCancelled) {
        const nextInterval = processingClases.length > 0 ? 5000 : 30000; // 5s si hay videos procesando, 30s si no
        timeoutId = setTimeout(checkAllProcessingVideos, nextInterval);
      }
    };

    // Primera ejecución inmediata
    checkAllProcessingVideos();

    return () => {
      isCancelled = true;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [params.id, contenidos.clases.length]);

  // Mover el early return aquí, después de todos los hooks
  if (!curso) {
    return null;
  }

  const abrirReproductor = async (videoId: string) => {
    try {
      const res = await fetch(`/api/admin/clases/otp/${videoId}`, { cache: 'no-store' })
      if (!res.ok) throw new Error('Error obteniendo OTP')
      const data = await res.json()
      setPlayerData({ otp: data.otp, playbackInfo: data.playbackInfo })
      setShowPlayerModal(true)
    } catch (e) {
      setToast({ message: 'No se pudo abrir el reproductor', type: 'error' })
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <button
          onClick={() => router.push('/profesor')}
          className="mb-6 flex items-center gap-2 text-gray-600 hover:text-purple-700 font-medium"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Atrás
        </button>
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white shadow-lg rounded-xl p-8 mb-8 border border-blue-200">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-6">
            <div className="text-center sm:text-left">
              <h1 className="text-3xl font-bold">
                {curso.nombre}
              </h1>
              <p className="mt-2 text-blue-100">
                {curso.universidad} • {curso.curso_academico}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setTipoContenidoSeleccionado('apunte');
                  setShowNewContenidoModal(true);
                }}
                className="px-4 py-2 bg-white text-blue-700 rounded-lg hover:bg-blue-50 transition-colors flex items-center gap-2 font-semibold shadow-lg border border-white/50"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
                </svg>
                Subir archivo
              </button>
              <button
                onClick={() => {
                  setTipoContenidoSeleccionado('clase');
                  setShowNewContenidoModal(true);
                }}
                className="px-4 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800 transition-colors flex items-center gap-2 font-semibold"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
                </svg>
                Subir clase
              </button>
            </div>
          </div>
        </div>

        {/* Secciones de Contenido */}
        <div className="space-y-8">
          {/* Sección de Apuntes */}
          <div className="bg-white shadow-lg rounded-xl p-6 border border-gray-100">
            <h2 className="text-xl font-semibold text-gray-800 mb-6 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
                <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
              </svg>
              Apuntes
            </h2>
            <div className="space-y-4">
              {contenidos.apuntes.map((apunte) => (
                <div
                  key={apunte.id}
                  className="flex items-center justify-between p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  <div>
                    <h3 className="font-medium text-gray-900">{apunte.titulo}</h3>
                    {apunte.descripcion && (
                      <p className="text-sm text-gray-500">{apunte.descripcion}</p>
                    )}
                    {apunte.archivo_url && (
                      <a
                        href={apunte.archivo_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 mt-1"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
                        </svg>
                        Ver PDF
                      </a>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleDeleteContenido(apunte)}
                      className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
              {contenidos.apuntes.length === 0 && (
                <div className="text-center py-8 bg-blue-50 rounded-lg border-2 border-dashed border-blue-200">
                  <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="mt-2 text-gray-500">No hay apuntes disponibles</p>
                </div>
              )}
            </div>
          </div>

          {/* Sección de Problemas */}
          <div className="bg-white shadow-lg rounded-xl p-6 border border-gray-100">
            <h2 className="text-xl font-semibold text-gray-800 mb-6 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1.323l3.954 1.582 1.599-.8a1 1 0 01.894 1.79l-1.233.616 1.738 5.42a1 1 0 01-.285 1.05A3.989 3.989 0 0115 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.715-5.349L11 6.477V16h2a1 1 0 110 2H7a1 1 0 110-2h2V6.477L6.237 7.582l1.715 5.349a1 1 0 01-.285 1.05A3.989 3.989 0 015 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.738-5.42-1.233-.616a1 1 0 01.894-1.79l1.599.8L9 4.323V3a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
              Problemas
            </h2>
                <div className="space-y-4">
              {contenidos.problemas.map((problema) => (
                    <div 
                  key={problema.id}
                  className="flex items-center justify-between p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
                    >
                      <div>
                    <h3 className="font-medium text-gray-900">{problema.titulo}</h3>
                    {problema.descripcion && (
                      <p className="text-sm text-gray-500">{problema.descripcion}</p>
                    )}
                    {problema.archivo_url && (
                      <a
                        href={problema.archivo_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 mt-1"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
                        </svg>
                        Ver PDF
                      </a>
                    )}
                      </div>
                  <div className="flex items-center gap-2">
                      <button 
                      onClick={() => handleDeleteContenido(problema)}
                      className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                      >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      </button>
                  </div>
                    </div>
                  ))}
              {contenidos.problemas.length === 0 && (
                <div className="text-center py-8 bg-green-50 rounded-lg border-2 border-dashed border-green-200">
                  <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="mt-2 text-gray-500">No hay problemas disponibles</p>
                </div>
              )}
            </div>
          </div>

          {/* Sección de Clases */}
          <div className="bg-white shadow-lg rounded-xl p-6 border border-gray-100">
            <h2 className="text-xl font-semibold text-gray-800 mb-6 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
              </svg>
              Clases Grabadas
            </h2>
            <div className="space-y-4">
              {contenidos.clases.map((clase) => {
                return (
                <div
                  key={clase.id}
                  className="flex items-center justify-between p-4 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                >
                    <div className="flex-grow">
                      <div className="flex items-center gap-2">
                    <h3 className="font-medium text-gray-900">{clase.titulo}</h3>
                        {getStatusBadge((clase.estado_procesamiento as 'processing' | 'ready' | 'failed') || 'processing')}
                      </div>
                    {clase.descripcion && (
                      <p className="text-sm text-gray-500">{clase.descripcion}</p>
                    )}
                      <div className="text-xs text-gray-500 mt-2">
                        {clase.duracion && (
                          <p>Duración (s): {clase.duracion}</p>
                        )}
                        {clase.fecha && (
                          <p>Fecha: {clase.fecha}</p>
                        )}
                      </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => clase.archivo_url && abrirReproductor(clase.archivo_url)}
                      className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                    >
                      Ver clase
                    </button>
                    <button
                      onClick={() => handleDeleteContenido(clase)}
                      className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </button>
                </div>
              </div>
                );
              })}
              {contenidos.clases.length === 0 && (
                <div className="text-center py-8 bg-red-50 rounded-lg border-2 border-dashed border-red-200">
                  <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="mt-2 text-gray-500">No hay clases grabadas disponibles</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal para crear nuevo contenido */}
      {showNewContenidoModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-gray-900">
                {tipoContenidoSeleccionado === 'apunte' && 'Nuevo Apunte'}
                {tipoContenidoSeleccionado === 'problema' && 'Nuevo Problema'}
                {tipoContenidoSeleccionado === 'clase' && 'Nueva Clase'}
              </h3>
              <button
                onClick={() => setShowNewContenidoModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={async (e) => {
              e.preventDefault();
              setIsSubmitting(true);
              // Cerrar el formulario inmediatamente
              setShowNewContenidoModal(false);
              try {
                let archivo_url = formData.archivo_url;
                if ((tipoContenidoSeleccionado === 'apunte' || tipoContenidoSeleccionado === 'problema') && formData.archivo instanceof File) {
                  const fileExt = formData.archivo.name.split('.').pop();
                  const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
                  const filePath = `${params.id}/${fileName}`;
                  const { error: uploadError } = await supabase.storage
                    .from('contenidos')
                    .upload(filePath, formData.archivo, { upsert: true });
                  if (uploadError) throw uploadError;
                  const { data: { publicUrl } } = supabase.storage
                    .from('contenidos')
                    .getPublicUrl(filePath);
                  archivo_url = publicUrl;
                }
                if (tipoContenidoSeleccionado === 'clase' && formData.archivo instanceof File) {
                  setToast({ message: 'Subiendo video a VdoCipher...', type: 'success' });
                  // 1. Crear upload link en el backend propio
                  const createRes = await fetch('/api/admin/clases/upload', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ title: formData.titulo })
                  });
                  if (!createRes.ok) throw new Error('Error creando upload link en VdoCipher');
                  const createData = await createRes.json();
                  console.log('createRes.ok:', createRes.ok);
                  console.log('createData completo:', createData);
                  const uploadLink = createData.uploadLink;
                  const videoId = createData.videoId;
                  console.log('uploadLink extraído:', uploadLink);
                  console.log('videoId extraído:', videoId);

                  if (!uploadLink || !videoId) {
                    console.error('ERROR: uploadLink o videoId son undefined!');
                    throw new Error('No se pudieron extraer uploadLink o videoId');
                  }

                  // 2. Insert inmediato (server-side) para evitar RLS y mostrar en la lista enseguida
                  const createContenidoRes = await fetch('/api/admin/contenidos/create', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      titulo: formData.titulo,
                      descripcion: formData.descripcion,
                      tipo: 'clase',
                      curso_id: params.id,
                      archivo_url: videoId,
                      estado_procesamiento: 'processing',
                      fecha: formData.fecha === '' ? null : formData.fecha,
                      duracion: formData.duracion,
                      orden: 0
                    })
                  });
                  if (!createContenidoRes.ok) {
                    const err = await createContenidoRes.json();
                    throw new Error(`Insert contenido failed: ${JSON.stringify(err)}`);
                  }
                  // Refrescar lista para que aparezca con "Procesando..." inmediatamente
                  await recargarContenidos();
                  
                  // Mostrar mensaje de éxito inmediatamente
                  setToast({ message: 'Clase creada. Procesando video...', type: 'success' });
                  
                  // Cerrar modal inmediatamente para mostrar el estado "Procesando"
                  resetFormulario();
                  setShowNewContenidoModal(false);

                  // 3. Subir el archivo de video a la URL de upload (POST FormData)
                  const uploadFormData = new FormData();
                  const { clientPayload } = createData;

                  // Campos obligatorios de VdoCipher
                  uploadFormData.append('policy', clientPayload.policy);
                  uploadFormData.append('key', clientPayload.key);
                  uploadFormData.append('x-amz-signature', clientPayload['x-amz-signature']);
                  uploadFormData.append('x-amz-algorithm', clientPayload['x-amz-algorithm']);
                  uploadFormData.append('x-amz-date', clientPayload['x-amz-date']);
                  uploadFormData.append('x-amz-credential', clientPayload['x-amz-credential']);
                  uploadFormData.append('success_action_status', '201');
                  uploadFormData.append('success_action_redirect', '');
                  uploadFormData.append('file', formData.archivo); // Archivo al final

                  const uploadRes = await fetch(clientPayload.uploadLink, {
                    method: 'POST',
                    body: uploadFormData
                  });

                  if (uploadRes.status === 201) {
                    console.log('✅ Upload exitoso');
                    archivo_url = videoId;
                  } else {
                    const errorText = await uploadRes.text();
                    // Marcar como failed si falla la subida
                    await fetch('/api/admin/contenidos/update-by-video', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ archivo_url: videoId, estado_procesamiento: 'failed' })
                    });
                    throw new Error(`Upload failed: ${uploadRes.status}`);
                  }

                  // 4. Poll en background hasta 'ready' y actualizar registro (server-side)
                  waitForVideoReady(videoId)
                    .then(async (readyVideo) => {
                      await fetch('/api/admin/contenidos/update-by-video', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ archivo_url: videoId, estado_procesamiento: 'ready', duracion: readyVideo.length ? String(readyVideo.length) : null })
                      });
                      await recargarContenidos();
                    })
                    .catch((error) => console.error('Error processing video:', error));
                }
                if (editContenidoId) {
                  // UPDATE
                  const { error: updateError } = await supabase
                    .from('contenidos')
                    .update({
                      titulo: formData.titulo,
                      descripcion: formData.descripcion,
                      tipo: tipoContenidoSeleccionado,
                      curso_id: params.id,
                      archivo_url,
                      fecha: formData.fecha === '' ? null : formData.fecha,
                      duracion: formData.duracion,
                    })
                    .eq('id', editContenidoId);
                  if (updateError) throw updateError;
                } else if (tipoContenidoSeleccionado !== 'clase') {
                  // INSERT para apunte/problema
                  const { error: insertError } = await supabase
                    .from('contenidos')
                    .insert([{
                      titulo: formData.titulo,
                      descripcion: formData.descripcion,
                      tipo: tipoContenidoSeleccionado,
                      curso_id: params.id,
                      archivo_url,
                      fecha: formData.fecha === '' ? null : formData.fecha,
                      duracion: formData.duracion,
                      orden: 0
                    }]);
                  if (insertError) throw insertError;
                }
                // Para contenido que no sea clase, recargar y cerrar modal normalmente
                if (tipoContenidoSeleccionado !== 'clase') {
                  await recargarContenidos();
                  resetFormulario();
                  setShowNewContenidoModal(false);
                  setToast({ message: editContenidoId ? 'Contenido actualizado correctamente' : 'Contenido creado correctamente', type: 'success' });
                }
              } catch (error) {
                setToast({ message: 'Error al crear o actualizar el contenido', type: 'error' });
              } finally {
                setIsSubmitting(false);
              }
            }} className="space-y-4">
              {/* Tipo de contenido (select) */}
              <div>
                <label htmlFor="tipo" className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo de contenido
                </label>
                <select
                  id="tipo"
                  value={tipoContenidoSeleccionado}
                  onChange={e => setTipoContenidoSeleccionado(e.target.value as 'apunte' | 'problema' | 'clase')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  required
                >
                  <option value="apunte">Apuntes</option>
                  <option value="problema">Problemas</option>
                  <option value="clase">Clases</option>
                </select>
              </div>
              {/* Título (siempre) */}
              <div>
                <label htmlFor="titulo" className="block text-sm font-medium text-gray-700 mb-1">
                  Título
                </label>
                <input
                  type="text"
                  id="titulo"
                  value={formData.titulo}
                  onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  required
                />
              </div>
              {/* Mostrar campos de descripción y archivo solo si NO es clase */}
              {tipoContenidoSeleccionado !== 'clase' && (
                <>
                  <div>
                    <label htmlFor="descripcion" className="block text-sm font-medium text-gray-700 mb-1">
                      Descripción
                    </label>
                    <textarea
                      id="descripcion"
                      value={formData.descripcion}
                      onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      rows={3}
                    />
                  </div>
                  <div>
                    <label htmlFor="archivo" className="block text-sm font-medium text-gray-700 mb-1">
                      Archivo (PDF u otro)
                    </label>
                    <input
                      type="file"
                      id="archivo"
                      accept="application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,image/*"
                      ref={fileInputRef}
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) {
                          setFormData({ ...formData, archivo: file })
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      required
                    />
                  </div>
                </>
              )}
              {/* Mostrar input de archivo de video solo si es clase */}
              {tipoContenidoSeleccionado === 'clase' && (
                <div>
                  <label htmlFor="video" className="block text-sm font-medium text-gray-700 mb-1">
                    Archivo de video (mp4, mov, etc)
                  </label>
                  <input
                    type="file"
                    id="video"
                    accept="video/*"
                    ref={fileInputRef}
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) {
                        setFormData({ ...formData, archivo: file })
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    required
                  />
                </div>
              )}

              <div className="flex justify-end gap-2 mt-6">
                <button
                  type="button"
                  onClick={() => setShowNewContenidoModal(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`px-4 py-2 text-white rounded-md transition-colors ${isSubmitting ? 'bg-purple-400 cursor-not-allowed' : 'bg-purple-600 hover:bg-purple-700'}`}
                >
                  {isSubmitting && tipoContenidoSeleccionado === 'clase' ? 'Subiendo...' : isSubmitting ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast de notificaciones */}
      {toast && (
        <div className={`fixed bottom-4 right-4 px-6 py-3 rounded-lg shadow-lg ${
          toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'
        } text-white`}>
          {toast.message}
        </div>
      )}

      {/* Modal Reproductor */}
      {showPlayerModal && playerData && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl p-0 overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b">
              <h4 className="text-lg font-semibold">Reproductor</h4>
              <button onClick={() => setShowPlayerModal(false)} className="text-gray-500 hover:text-gray-700">✕</button>
            </div>
            <div className="p-0">
              <div style={{ paddingTop: '56.25%', position: 'relative' as const }}>
                <iframe
                  src={`https://player.vdocipher.com/v2/?otp=${encodeURIComponent(playerData.otp)}&playbackInfo=${encodeURIComponent(playerData.playbackInfo)}`}
                  style={{ border: 0, maxWidth: '100%', position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
                  allowFullScreen={true}
                  allow="encrypted-media"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}