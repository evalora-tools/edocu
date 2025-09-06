'use client'

import { useEffect, useRef, useState } from 'react'
import { useVideoTracking } from '@/hooks/useVideoTracking'
import Toast from '@/components/ui/Toast'

interface VdoCipherPlayerProps {
  otp: string
  playbackInfo: string
  contenidoId: string
  titulo?: string
  duracion?: number
  onClose: () => void
  onSuspiciousActivity?: (reason: string) => void
}

export default function VdoCipherPlayer({
  otp,
  playbackInfo,
  contenidoId,
  titulo,
  duracion,
  onClose,
  onSuspiciousActivity
}: VdoCipherPlayerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' } | null>(null)
  const [isBlocked, setIsBlocked] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)

  const {
    session,
    isTracking,
    error,
    trackEvent,
    endSession
  } = useVideoTracking({
    contenidoId,
    duracionVideo: duracion,
    onSuspiciousActivity: (reason) => {
      // Solo mostrar advertencia para casos realmente graves
      if (reason.includes('múltiples ubicaciones') || reason.includes('múltiples dispositivos')) {
        setToast({
          message: `Aviso de seguridad: ${reason}. Tu actividad está siendo monitoreada.`,
          type: 'warning'
        })
      } else {
        // Para otros casos, solo log sin bloquear
        console.warn('Actividad detectada:', reason)
      }
    },
    onWarning: (message) => {
      setToast({
        message,
        type: 'warning'
      })
    }
  })

  // Simular eventos de video para VdoCipher
  useEffect(() => {
    if (!isTracking || isBlocked) return

    const handleMessage = (event: MessageEvent) => {
      // VdoCipher sends messages about video events
      if (event.origin !== 'https://player.vdocipher.com') return

      try {
        const data = event.data
        if (typeof data === 'object' && data.type) {
          switch (data.type) {
            case 'play':
              setIsPlaying(true)
              trackEvent('play', Math.floor(data.currentTime || currentTime))
              break
            case 'pause':
              setIsPlaying(false)
              trackEvent('pause', Math.floor(data.currentTime || currentTime))
              break
            case 'timeupdate':
              setCurrentTime(data.currentTime || 0)
              break
            case 'ended':
              setIsPlaying(false)
              trackEvent('ended', Math.floor(data.currentTime || currentTime))
              break
            case 'seeked':
              trackEvent('seek', Math.floor(data.currentTime || currentTime))
              break
          }
        }
      } catch (err) {
        console.error('Error processing VdoCipher message:', err)
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [isTracking, isBlocked, trackEvent, currentTime])

  // Track close event when component unmounts
  useEffect(() => {
    return () => {
      if (isPlaying) {
        trackEvent('close', Math.floor(currentTime))
      }
      endSession()
    }
  }, [isPlaying, currentTime, trackEvent, endSession])

  // Periodic time update for tracking
  useEffect(() => {
    if (!isPlaying || isBlocked) return

    const interval = setInterval(() => {
      // Send periodic update with current position
      trackEvent('play', Math.floor(currentTime))
    }, 30000) // Every 30 seconds

    return () => clearInterval(interval)
  }, [isPlaying, isBlocked, currentTime, trackEvent])

  // Show error if there's one
  useEffect(() => {
    if (error) {
      setToast({
        message: error,
        type: 'error'
      })
    }
  }, [error])

  const handleClose = () => {
    if (isPlaying) {
      trackEvent('close', Math.floor(currentTime))
    }
    endSession()
    onClose()
  }

  if (isBlocked) {
    return (
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-8 text-center">
          {toast && (
            <Toast
              message={toast.message}
              type={toast.type}
              onClose={() => setToast(null)}
            />
          )}
          <div className="mx-auto h-16 w-16 text-red-400 mb-4">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium mb-2">Acceso Bloqueado</h3>
          <p className="text-sm text-gray-600 mb-4">
            Se ha detectado actividad sospechosa en tu cuenta.
          </p>
          <p className="text-xs text-gray-500 mb-6">
            Si crees que esto es un error, contacta al soporte técnico.
          </p>
          <button
            onClick={handleClose}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl overflow-hidden border border-white/20">
        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}
        
        <div className="flex justify-between items-center p-6 border-b border-gray-100">
          <div className="flex items-center space-x-4">
            <h4 className="text-xl font-semibold text-gray-900">
              {titulo || 'Reproductor de Video'}
            </h4>
            {isTracking && (
              <div className="flex items-center text-sm text-green-600">
                <div className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></div>
                Sesión activa
              </div>
            )}
          </div>
          <button 
            onClick={handleClose}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="p-0 relative">
          {/* Loading overlay */}
          {!isTracking && !error && (
            <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-10">
              <div className="text-white text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
                <p className="text-sm">Iniciando sesión de seguimiento...</p>
              </div>
            </div>
          )}
          
          <div style={{ paddingTop: '56.25%', position: 'relative' }}>
            <iframe
              ref={iframeRef}
              src={`https://player.vdocipher.com/v2/?otp=${encodeURIComponent(otp)}&playbackInfo=${encodeURIComponent(playbackInfo)}`}
              style={{ 
                border: 0, 
                maxWidth: '100%', 
                position: 'absolute', 
                top: 0, 
                left: 0, 
                width: '100%', 
                height: '100%',
                opacity: isTracking ? 1 : 0.5
              }}
              allowFullScreen={true}
              allow="encrypted-media"
              title={titulo || 'Video Player'}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
