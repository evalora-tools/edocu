import { useEffect, useRef, useState } from 'react';

interface VdoCipherPlayerProps {
  otp: string;
  playbackInfo: string;
  titulo?: string;
  onClose?: () => void;
  userId?: string;
  contenidoId?: string;
}

export default function VdoCipherPlayer({ otp, playbackInfo, titulo, onClose, userId, contenidoId }: VdoCipherPlayerProps) {
  const startTimeRef = useRef<Date | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showFullscreenWarning, setShowFullscreenWarning] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Función para iniciar la sesión de visualización
  const startWatchSession = async () => {
    if (!userId || !contenidoId) return;
    
    try {
      const response = await fetch('/api/video/start-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          contenidoId
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        sessionIdRef.current = data.sessionId;
        startTimeRef.current = new Date();
      }
    } catch (error) {
      console.error('Error iniciando sesión de visualización:', error);
    }
  };

  // Función para finalizar la sesión de visualización
  const endWatchSession = async () => {
    if (!sessionIdRef.current || !startTimeRef.current) return;
    
    const endTime = new Date();
    const watchTimeSeconds = Math.floor((endTime.getTime() - startTimeRef.current.getTime()) / 1000);
    
    try {
      await fetch('/api/video/end-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: sessionIdRef.current,
          watchTimeSeconds
        })
      });
    } catch (error) {
      console.error('Error finalizando sesión de visualización:', error);
    }
    
    // Limpiar referencias
    sessionIdRef.current = null;
    startTimeRef.current = null;
  };

  // Función personalizada para cerrar el reproductor
  const handleClose = () => {
    endWatchSession();
    if (onClose) {
      onClose();
    }
  };

  // Efecto para iniciar el contador cuando se monta el componente
  useEffect(() => {
    startWatchSession();
    
    // Cleanup al desmontar el componente
    return () => {
      endWatchSession();
    };
  }, [userId, contenidoId]);

  // Efecto para capturar eventos de cierre de ventana/pestaña
  useEffect(() => {
    const handleBeforeUnload = () => {
      endWatchSession();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  // Efecto para detectar cambios en pantalla completa
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = !!(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement
      );
      
      setIsFullscreen(isCurrentlyFullscreen);
      
      // Si entra en pantalla completa, ocultar la advertencia
      if (isCurrentlyFullscreen) {
        setShowFullscreenWarning(false);
      }
    };

    // Agregar listeners para diferentes navegadores
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, []);

  // Efecto para manejar el timer de 20 segundos
  useEffect(() => {
    // Iniciar el timer solo cuando se monta el componente
    timerRef.current = setTimeout(() => {
      if (!isFullscreen) {
        setShowFullscreenWarning(true);
      }
    }, 20000); // 20 segundos

    // Cleanup del timer
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []); // Solo se ejecuta al montar el componente

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden border border-white/20 relative">
        <div className="flex justify-between items-center p-6 border-b border-gray-100">
          <h4 className="text-xl font-semibold text-gray-900">
            {titulo || 'Reproductor de Video'}
          </h4>
          {onClose && (
            <button
              onClick={handleClose}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        <div className="p-0 relative">
          <div style={{ paddingTop: '56.25%', position: 'relative' }}>
            <iframe
              src={`https://player.vdocipher.com/v2/?otp=${encodeURIComponent(otp)}&playbackInfo=${encodeURIComponent(playbackInfo)}`}
              style={{
                border: 0,
                maxWidth: '100%',
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%'
              }}
              allowFullScreen={true}
              allow="encrypted-media"
              title={titulo || 'Video Player'}
            />
          </div>
          
          {/* Mensaje de advertencia para pantalla completa */}
          {showFullscreenWarning && (
            <div className="absolute inset-0 bg-black/90 flex items-center justify-center z-10">
              <div className="bg-white rounded-xl p-8 max-w-md mx-4 text-center shadow-2xl">
                <div className="mb-6">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-red-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.732 6.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    ¡Pantalla Completa Requerida!
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Para continuar viendo el video, debes activar el modo de pantalla completa.
                  </p>
                </div>
                
                <p className="text-sm text-gray-500">
                  Cierra el reproductor, y vuelve a abrir el contenido en pantalla completa.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
