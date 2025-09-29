'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Toast from '@/components/ui/Toast'
import FilePreviewer from '@/components/ui/FilePreviewer'

interface Curso {
  id: string
  nombre: string
  universidad: string
  curso_academico: string
  academia_id: string
}

interface Academia {
  id: string
  nombre: string
}

interface Seccion {
  id: string
  titulo: string
  orden: number
  curso_id: string
  created_at: string
}

interface Contenido {
  id: string
  tipo: string
  titulo: string
  descripcion: string | null
  archivo_url: string | null
  fecha: string | null
  duracion: string | null
  orden: number
  created_at: string
  curso_id: string
  seccion_id: string | null
  estado_procesamiento: string | null
}

export default function ProfesorCursoPage() {
  const router = useRouter()
  const params = useParams()
  const cursoId = params.id as string

  const [loading, setLoading] = useState(true)
  const [loadingState, setLoadingState] = useState<string>('Iniciando...')
  const [curso, setCurso] = useState<Curso | null>(null)
  const [academia, setAcademia] = useState<Academia | null>(null)
  const [cursos, setCursos] = useState<Curso[]>([])
  const [contenidos, setContenidos] = useState<Contenido[]>([])
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [uploadModal, setUploadModal] = useState(false)
  const [uploadType, setUploadType] = useState<'apunte' | 'problema' | 'clase'>('apunte')
  const [uploadForm, setUploadForm] = useState({
    titulo: '',
    descripcion: '',
    archivo: null as File | null,
    seccionId: null as string | null
  })
  const [isUploading, setIsUploading] = useState(false)
  const [playerData, setPlayerData] = useState<{ otp: string; playbackInfo: string } | null>(null)
  const [showPlayerModal, setShowPlayerModal] = useState(false)
  const [isOpening, setIsOpening] = useState(false)
  const [secciones, setSecciones] = useState<Seccion[]>([])
  const [showSeccionModal, setShowSeccionModal] = useState(false)
  const [seccionForm, setSeccionForm] = useState({ titulo: '' })
  // Estado para controlar el despliegue de secciones
  const [openSecciones, setOpenSecciones] = useState<{ [id: string]: boolean }>({})
  // Estados para el previsualizador de archivos
  const [showFilePreviewer, setShowFilePreviewer] = useState(false)
  const [previewFile, setPreviewFile] = useState<{ url: string; name: string; technicalFileName?: string } | null>(null)

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
          .select('role, academia_id, cursos_asignados')
          .eq('id', session.user.id)
          .single()

        if (!profile || profile.role !== 'profesor') {
          setLoadingState('Sin acceso de profesor')
          setTimeout(() => {
            router.replace('/')
          }, 1500)
          return
        }

        if (!profile.cursos_asignados?.includes(cursoId)) {
          setLoadingState('Sin acceso a este curso')
          setTimeout(() => {
            router.replace('/profesor')
          }, 1500)
          return
        }

        setLoadingState('Cargando información del curso...')
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
  }, [router, cursoId])

  // Función para verificar status de video en VdoCipher
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

  // Función para recargar contenidos
  const recargarContenidos = async () => {
    const { data: contenidosData, error } = await supabase
      .from('contenidos')
      .select('*')
      .eq('curso_id', cursoId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error cargando contenidos:', error);
      return;
    }

    setContenidos(contenidosData || []);
  };

  const fetchSecciones = async () => {
    const { data, error } = await supabase
      .from('secciones')
      .select('*')
      .eq('curso_id', cursoId)
      .order('orden', { ascending: true });
    if (!error) setSecciones(data || []);
  };

  const handleCreateSeccion = async () => {
    if (!seccionForm.titulo.trim()) {
      setToast({ message: 'Por favor, ingresa un título para la sección', type: 'error' })
      return
    }

    try {
      const { data: seccion, error } = await supabase
        .from('secciones')
        .insert([{
          titulo: seccionForm.titulo.trim(),
          curso_id: cursoId,
          orden: secciones.length
        }])
        .select()
        .single()

      if (error) {
        console.error('Error al crear sección:', error)
        if (error.code === '42P01') {
          setToast({ message: 'Error: La tabla de secciones no existe. Contacta al administrador.', type: 'error' })
        } else if (error.code === '23503') {
          setToast({ message: 'Error: No tienes permiso para crear secciones en este curso.', type: 'error' })
        } else {
          setToast({ message: `Error al crear la sección: ${error.message}`, type: 'error' })
        }
        return
      }

      await fetchSecciones();
      setShowSeccionModal(false);
      setSeccionForm({ titulo: '' });
      setToast({ message: 'Sección creada correctamente', type: 'success' });
    } catch (error) {
      console.error('Error creando sección:', error);
      setToast({ message: 'Error al crear la sección', type: 'error' });
    }
  };

  const handleDeleteSeccion = async (seccionId: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta sección? Los contenidos se moverán a "Sin sección"')) return;
    try {
      const { error } = await supabase
        .from('secciones')
        .delete()
        .eq('id', seccionId);
      if (error) throw error;
      await fetchSecciones();
      await recargarContenidos();
      setToast({ message: 'Sección eliminada correctamente', type: 'success' });
    } catch (error) {
      console.error('Error eliminando sección:', error);
      setToast({ message: 'Error al eliminar la sección', type: 'error' });
    }
  };

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

      setLoadingState('Cargando información del curso...')

      // Cargar información del curso
      const { data: cursoData, error: cursoError } = await supabase
        .from('cursos')
        .select('*')
        .eq('id', cursoId)
        .single()

      if (cursoError) {
        console.error('Error cargando curso:', cursoError)
        return
      }

      setCurso(cursoData)

      setLoadingState('Cargando tus cursos...')

      // Cargar todos los cursos del profesor para el sidebar
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

      setLoadingState('Cargando secciones del curso...')

      // Cargar secciones del curso
      const { data: seccionesData, error: seccionesError } = await supabase
        .from('secciones')
        .select('*')
        .eq('curso_id', cursoId)
        .order('orden', { ascending: true })

      if (seccionesError) {
        console.error('Error cargando secciones:', seccionesError)
      } else {
        setSecciones(seccionesData || [])
      }

      setLoadingState('Cargando contenidos del curso...')

      // Cargar contenidos del curso
      const { data: contenidosData, error: contenidosError } = await supabase
        .from('contenidos')
        .select('*')
        .eq('curso_id', cursoId)
        .order('created_at', { ascending: false })

      if (contenidosError) {
        console.error('Error cargando contenidos:', contenidosError)
        return
      }

      console.log('Contenidos cargados:', contenidosData)
      console.log('Curso ID actual:', cursoId)
      if (contenidosData && contenidosData.length > 0) {
        console.log('Primer contenido estructura:', contenidosData[0])
        console.log('Tipos de contenidos encontrados:', contenidosData.map(c => c.tipo))
      }
      setContenidos(contenidosData || [])
    } catch (error) {
      console.error('Error cargando datos:', error)
    }
  }

  // Función para abrir/reproducir contenido
  const handleOpenContent = async (contenido: Contenido) => {
    if (contenido.tipo === 'clase') {
      // Para videos, obtener OTP y abrir player
      if (contenido.estado_procesamiento !== 'ready') {
        setToast({ message: 'El video aún se está procesando', type: 'error' })
        return
      }

      try {
        setIsOpening(true)
        const response = await fetch(`/api/admin/clases/otp/${contenido.archivo_url}`, { cache: 'no-store' })
        if (!response.ok) throw new Error('Error obteniendo OTP')
        
        const data = await response.json()
        setPlayerData({
          otp: data.otp,
          playbackInfo: data.playbackInfo
        })
        setShowPlayerModal(true)
      } catch (error) {
        console.error('Error obteniendo OTP:', error)
        setToast({ message: 'Error al cargar el video', type: 'error' })
      } finally {
        setIsOpening(false)
      }
    } else {
      // Para archivos, abrir en el previsualizador
      if (contenido.archivo_url) {
        // Extraer el nombre técnico del archivo de la URL para la detección de tipo
        const urlParts = contenido.archivo_url.split('/')
        const technicalFileName = urlParts[urlParts.length - 1]
        
        setPreviewFile({
          url: contenido.archivo_url,
          name: contenido.titulo,
          technicalFileName: technicalFileName
        })
        setShowFilePreviewer(true)
      } else {
        setToast({ message: 'Archivo no disponible', type: 'error' })
      }
    }
  }

  const handleUpload = async () => {
    if (!uploadForm.titulo) {
      setToast({ message: 'Por favor, completa el título', type: 'error' })
      return
    }

    if (!uploadForm.archivo) {
      setToast({ message: 'Por favor, selecciona un archivo', type: 'error' })
      return
    }

    setIsUploading(true)
    setUploadModal(false) // Cerrar modal inmediatamente

    try {
      let archivo_url = null;

      if ((uploadType === 'apunte' || uploadType === 'problema') && uploadForm.archivo instanceof File) {
        // Subir archivo a Supabase Storage
        const fileExt = uploadForm.archivo.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `${cursoId}/${fileName}`;
        
        const { error: uploadError } = await supabase.storage
          .from('contenidos')
          .upload(filePath, uploadForm.archivo, { upsert: true });
        
        if (uploadError) throw uploadError;
        
        const { data: { publicUrl } } = supabase.storage
          .from('contenidos')
          .getPublicUrl(filePath);
        
        archivo_url = publicUrl;

        // Insertar contenido directamente en Supabase
        const { error: insertError } = await supabase
          .from('contenidos')
          .insert([{
            titulo: uploadForm.titulo,
            descripcion: uploadForm.descripcion || null,
            tipo: uploadType,
            curso_id: cursoId,
            archivo_url,
            estado_procesamiento: 'ready',
            orden: 0,
            fecha: null,
            duracion: null,
            seccion_id: uploadForm.seccionId
          }]);

        if (insertError) throw insertError;

        await recargarContenidos();
        setToast({ message: 'Archivo subido correctamente', type: 'success' })
      }

      if (uploadType === 'clase' && uploadForm.archivo instanceof File) {
        setToast({ message: 'Subiendo video...', type: 'success' });
        
        // 1. Crear upload link en VdoCipher
        const createRes = await fetch('/api/admin/clases/upload', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'same-origin',
          body: JSON.stringify({ title: uploadForm.titulo })
        });
        
        if (!createRes.ok) throw new Error('Error creando upload link en VdoCipher');
        
        const createData = await createRes.json();
        const uploadLink = createData.uploadLink;
        const videoId = createData.videoId;

        if (!uploadLink || !videoId) {
          throw new Error('No se pudieron extraer uploadLink o videoId');
        }

        // 2. Insertar contenido inmediatamente en estado "processing"
        const createContenidoRes = await fetch('/api/admin/contenidos/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({
            titulo: uploadForm.titulo,
            descripcion: uploadForm.descripcion || null,
            tipo: 'clase',
            curso_id: cursoId,
            archivo_url: videoId,
            estado_procesamiento: 'processing',
            orden: 0,
            fecha: null,
            duracion: null,
            seccion_id: uploadForm.seccionId
          })
        });
        
        if (!createContenidoRes.ok) {
          const err = await createContenidoRes.json();
          throw new Error(`Insert contenido failed: ${JSON.stringify(err)}`);
        }

        // Refrescar lista para mostrar "Procesando..."
        await recargarContenidos();
        setToast({ message: 'Clase creada. Procesando video...', type: 'success' });

        // 3. Subir el archivo de video a VdoCipher
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
        uploadFormData.append('file', uploadForm.archivo); // Archivo al final

        const uploadRes = await fetch(clientPayload.uploadLink, {
          method: 'POST',
          body: uploadFormData
        });

        if (uploadRes.status === 201) {
          console.log('✅ Upload exitoso');
          // Recargar contenidos tras subida exitosa
          await recargarContenidos();
          // 4. Polling en background hasta 'ready'
          waitForVideoReady(videoId)
            .then(async (readyVideo) => {
              await fetch('/api/admin/contenidos/update-by-video', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'same-origin',
                body: JSON.stringify({ 
                  archivo_url: videoId, 
                  estado_procesamiento: 'ready', 
                  duracion: readyVideo.length ? String(readyVideo.length) : null 
                })
              });
              await recargarContenidos();
            })
            .catch((error) => console.error('Error processing video:', error));
        } else {
          // Marcar como failed si falla la subida
          await fetch('/api/admin/contenidos/update-by-video', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify({ archivo_url: videoId, estado_procesamiento: 'failed' })
          });
          throw new Error(`Upload failed: ${uploadRes.status}`);
        }
      }

      // Reset form
      setUploadForm({ titulo: '', descripcion: '', archivo: null, seccionId: null })
      setUploadType('apunte')
      // Solución: forzar el cierre y reapertura del modal de sección para evitar inconsistencias
      setShowSeccionModal(false)
    } catch (error) {
      console.error('Error subiendo archivo:', error)
      setToast({ message: 'Error al subir el archivo', type: 'error' })
    } finally {
      setIsUploading(false)
      // Siempre recargar contenidos tras intentar subir
      await recargarContenidos();
    }
  }

  const handleDelete = async (contenidoId: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este contenido?')) return;
    try {
      const { error } = await supabase
        .from('contenidos')
        .delete()
        .eq('id', contenidoId);
      if (error) throw error;
      await recargarContenidos();
      setToast({ message: 'Contenido eliminado correctamente', type: 'success' });
    } catch (error) {
      console.error('Error eliminando contenido:', error);
      setToast({ message: 'Error al eliminar contenido', type: 'error' });
    }
  };

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

  // Si no hay curso después de la carga, no renderizar nada (ya se maneja en el useEffect)
  if (!curso) return null

  const getContenidosByTipo = (tipo: string) => {
    const filtered = contenidos.filter(c => c.tipo === tipo)
    console.log(`Contenidos tipo ${tipo}:`, filtered)
    return filtered
  }

  // Función para obtener el badge de estado con animación
  const getStatusBadge = (status: 'processing' | 'ready' | 'failed') => {
    const statusConfig = {
      'processing': { 
        text: 'Procesando...', 
        className: 'bg-yellow-100 text-yellow-800 animate-pulse',
      },
      'ready': { 
        text: 'Listo', 
        className: 'bg-green-100 text-green-800',
      },
      'failed': { 
        text: 'Error', 
        className: 'bg-red-100 text-red-800',
      }
    };

    const config = statusConfig[status] || statusConfig.ready;
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.className}`}>
        {config.text}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-25 via-blue-50 to-cyan-25 flex flex-col">
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

              <div 
                onClick={() => router.push('/profesor/analytics')}
                className="group flex items-center px-2 py-2 text-sm font-medium rounded-lg cursor-pointer transition-all duration-150 bg-white/0 hover:bg-blue-100/80 text-blue-900 hover:text-blue-700 shadow-sm"
              >
                <span className="w-6 h-6 bg-blue-200 rounded text-blue-900 text-xs flex items-center justify-center mr-3">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </span>
                Estadísticas
              </div>

              <div className="mt-8">
                <h3 className="px-3 text-xs font-semibold text-blue-700 uppercase tracking-wider my-3">
                  Mis Cursos
                </h3>
                <div className="mt-2 space-y-1">
                  {cursos.map((cursoItem) => (
                    <div 
                      key={cursoItem.id} 
                      onClick={() => router.push(`/profesor/curso/${cursoItem.id}`)}
                      className={`group flex items-center px-2 py-2 text-sm font-medium rounded-lg cursor-pointer transition-all duration-150
                        ${cursoItem.id === cursoId 
                          ? 'bg-blue-50 text-blue-700' 
                          : 'bg-white/0 hover:bg-blue-100/80 text-blue-900 hover:text-blue-700 shadow-sm'}
                      `}
                    >
                      <span className={`w-6 h-6 rounded text-blue-900 text-xs flex items-center justify-center mr-3 ${
                        cursoItem.id === cursoId ? 'bg-blue-200' : 'bg-blue-200'
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
        <div className="flex-1 ml-64 overflow-y-auto h-[calc(100vh-4rem)]">
          <div className="max-w-6xl mx-auto p-6">
            {/* Course Header */}
            <div className="h-52 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg mb-12 relative overflow-hidden">
              <div className="absolute inset-0 p-8 text-white">
                <h1 className="text-4xl font-normal mb-2">{curso.nombre}</h1>
                <p className="text-blue-100 text-lg">
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
              </div>
            </div>

            {/* Content Sections */}
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-normal text-gray-900">Contenido del Curso</h2>
              <div className="flex space-x-3">
                <button
                  onClick={() => setUploadModal(true)}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <span>Subir Archivo</span>
                </button>
                <button
                  onClick={() => setShowSeccionModal(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  <span>Nueva Sección</span>
                </button>
              </div>
            </div>

            <div className="space-y-12">
              {secciones.length === 0 && contenidos.filter(c => !c.seccion_id).length === 0 ? (
                <div className="text-center py-16">
                  <div className="mx-auto h-24 w-24 text-blue-300 mb-6">
                    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">No hay contenidos en esta asignatura</h3>
                  <p className="text-gray-600 max-w-md mx-auto">
                    Comienza a organizar tu curso añadiendo una nueva sección y subiendo material educativo.
                  </p>
                </div>
              ) : (
                <>
                  {secciones.map((seccion) => (
                    <section key={seccion.id} className="mb-12">
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
                        <button
                          onClick={e => { e.stopPropagation(); handleDeleteSeccion(seccion.id); }}
                          className="text-gray-400 hover:text-red-600 transition-colors"
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                      {openSecciones[seccion.id] && (
                        <div className="space-y-4">
                          {contenidos
                            .filter(c => c.seccion_id === seccion.id)
                            .map((contenido) => (
                              <div 
                                key={contenido.id} 
                                onClick={() => handleOpenContent(contenido)}
                                className="bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow duration-200 cursor-pointer"
                              >
                                <div className="flex items-start p-4">
                                  <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center mr-4">
                                    {contenido.tipo === 'apunte' ? (
                                      // Icono de libro abierto (Heroicons outline)
                                      <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6c-2.28-1.2-4.72-2-7-2v14c2.28 0 4.72.8 7 2m0-14c2.28-1.2 4.72-2 7-2v14c-2.28 0-4.72.8-7 2m0-14v14" />
                                      </svg>
                                    ) : (
                                      // Icono de video (actual)
                                      <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                      </svg>
                                    )}
                                  </div>
                                  <div className="flex-1">
                                    <h3 className="font-medium text-gray-900 mb-1">{contenido.titulo}</h3>
                                    <p className="text-gray-600 text-sm mb-2">{contenido.descripcion}</p>
                                    <div className="flex items-center justify-between">
                                      <p className="text-xs text-gray-500">{new Date(contenido.created_at).toLocaleDateString()}</p>
                                      {contenido.estado_procesamiento && (
                                        getStatusBadge(contenido.estado_procesamiento as 'processing' | 'ready' | 'failed')
                                      )}
                                    </div>
                                  </div>
                                  <button
                                    onClick={e => { e.stopPropagation(); handleDelete(contenido.id); }}
                                    className="text-red-500 hover:text-red-700 ml-4"
                                  >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                  </button>
                                </div>
                              </div>
                            ))}
                          {contenidos.filter(c => c.seccion_id === seccion.id).length === 0 && (
                            <div className="text-center py-8 text-gray-500">
                              No hay contenido en esta sección
                            </div>
                          )}
                        </div>
                      )}
                    </section>
                  ))}
                  {/* Contenidos sin sección: se muestran arriba, sin título */}
                  {contenidos.filter(c => !c.seccion_id).length > 0 && (
                    <div className="mb-12 space-y-4">
                      {contenidos.filter(c => !c.seccion_id).map((contenido) => (
                        <div 
                          key={contenido.id} 
                          onClick={() => handleOpenContent(contenido)}
                          className="bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow duration-200 cursor-pointer"
                        >
                          <div className="flex items-start p-4">
                            <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center mr-4">
                              {contenido.tipo === 'apunte' ? (
                                // Icono de libro abierto (Heroicons outline)
                                <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6c-2.28-1.2-4.72-2-7-2v14c2.28 0 4.72.8 7 2m0-14c2.28-1.2 4.72-2 7-2v14c-2.28 0-4.72.8-7 2m0-14v14" />
                                </svg>
                              ) : (
                                // Icono de video (actual)
                                <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                              )}
                            </div>
                            <div className="flex-1">
                              <h3 className="font-medium text-gray-900 mb-1">{contenido.titulo}</h3>
                              <p className="text-gray-600 text-sm mb-2">{contenido.descripcion}</p>
                              <div className="flex items-center justify-between">
                                <p className="text-xs text-gray-500">{new Date(contenido.created_at).toLocaleDateString()}</p>
                                {contenido.estado_procesamiento && (
                                  getStatusBadge(contenido.estado_procesamiento as 'processing' | 'ready' | 'failed')
                                )}
                              </div>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDelete(contenido.id)
                              }}
                              className="text-red-500 hover:text-red-700 ml-4"
                            >
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal para crear sección */}
      {showSeccionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                Nueva Sección
              </h3>
              <button
                onClick={() => {
                  setShowSeccionModal(false)
                  setSeccionForm({ titulo: '' })
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Título de la Sección
                </label>
                <input
                  type="text"
                  value={seccionForm.titulo}
                  onChange={(e) => setSeccionForm({ titulo: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ej: Primer Parcial, Teoría, etc."
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowSeccionModal(false)
                  setSeccionForm({ titulo: '' })
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateSeccion}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Crear Sección
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {uploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                Subir Archivo
              </h3>
              <button
                onClick={() => {
                  setUploadModal(false)
                  setUploadForm({ titulo: '', descripcion: '', archivo: null, seccionId: null })
                  setUploadType('apunte')
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo de Archivo
                  </label>
                  <select
                    value={uploadType}
                    onChange={(e) => setUploadType(e.target.value as 'apunte' | 'clase')}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="apunte">Apuntes</option>
                    <option value="clase">Video</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Sección
                  </label>
                  <select
                    value={uploadForm.seccionId || ''}
                    onChange={(e) => setUploadForm(prev => ({ ...prev, seccionId: e.target.value || null }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Sin sección</option>
                    {secciones.map(seccion => (
                      <option key={seccion.id} value={seccion.id}>
                        {seccion.titulo}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Título
                </label>
                <input
                  type="text"
                  value={uploadForm.titulo}
                  onChange={(e) => setUploadForm(prev => ({ ...prev, titulo: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Título del contenido"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descripción <span className="text-gray-400">(opcional)</span>
                </label>
                <textarea
                  value={uploadForm.descripcion}
                  onChange={(e) => setUploadForm(prev => ({ ...prev, descripcion: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Descripción del contenido (opcional)"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Archivo
                </label>
                <input
                  type="file"
                  onChange={(e) => setUploadForm(prev => ({ ...prev, archivo: e.target.files?.[0] || null }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  accept={uploadType === 'clase' ? 'video/*' : '*'}
                />
                {uploadForm.archivo && (
                  <p className="text-xs text-gray-500 mt-1">
                    Archivo seleccionado: {uploadForm.archivo.name}
                  </p>
                )}
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setUploadModal(false)
                  setUploadForm({ titulo: '', descripcion: '', archivo: null, seccionId: null })
                  setUploadType('apunte')
                }}
                disabled={isUploading}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancelar
              </button>
              <button
                onClick={handleUpload}
                disabled={isUploading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {isUploading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Subiendo...</span>
                  </>
                ) : (
                  <span>Subir</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Reproductor */}
      {showPlayerModal && playerData && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl overflow-hidden border border-white/20">
            <div className="flex justify-between items-center p-6 border-b border-gray-100">
              <h4 className="text-xl font-semibold text-gray-900">Reproductor de Video</h4>
              <button 
                onClick={() => setShowPlayerModal(false)} 
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-0">
              <div style={{ paddingTop: '56.25%', position: 'relative' as const }}>
                <iframe
                  src={`https://player.vdocipher.com/v2/?otp=${encodeURIComponent(playerData.otp)}&playbackInfo=${encodeURIComponent(playerData.playbackInfo)}`}
                  style={{ border: 0, maxWidth: '100%', position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
                  allowFullScreen={true}
                  allow="encrypted-media; autoplay"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Previsualizador de Archivos */}
      {previewFile && (
        <FilePreviewer
          isOpen={showFilePreviewer}
          onClose={() => {
            setShowFilePreviewer(false)
            setPreviewFile(null)
          }}
          fileUrl={previewFile.url}
          fileName={previewFile.name}
          technicalFileName={previewFile.technicalFileName}
        />
      )}
    </div>
  )
}
