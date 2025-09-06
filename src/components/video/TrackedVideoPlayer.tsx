'use client'

import { useEffect, useRef, useState } from 'react'
import { useVideoTracking } from '@/hooks/useVideoTracking'
import Toast from '@/components/ui/Toast'

interface TrackedVideoPlayerProps {
  src: string
  contenidoId: string
  duracion?: number
  poster?: string
  className?: string
  onSuspiciousActivity?: (reason: string) => void
}

export default function TrackedVideoPlayer({
  src,
  contenidoId,
  duracion,
  poster,
  className = '',
  onSuspiciousActivity
}: TrackedVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' } | null>(null)
  const [isBlocked, setIsBlocked] = useState(false)

  const {
    session,
    isTracking,
    error,
    attachToVideo,
    endSession
  } = useVideoTracking({
    contenidoId,
    duracionVideo: duracion,
    onSuspiciousActivity: (reason) => {
      setIsBlocked(true)
      setToast({
        message: `Acceso bloqueado: ${reason}`,
        type: 'error'
      })
      onSuspiciousActivity?.(reason)
    },
    onWarning: (message) => {
      setToast({
        message,
        type: 'warning'
      })
    }
  })

  // Adjuntar tracking al video cuando esté disponible
  useEffect(() => {
    if (videoRef.current && isTracking && !isBlocked) {
      const cleanup = attachToVideo(videoRef.current)
      return cleanup
    }
  }, [attachToVideo, isTracking, isBlocked])

  // Mostrar error si hay alguno
  useEffect(() => {
    if (error) {
      setToast({
        message: error,
        type: 'error'
      })
    }
  }, [error])

  // Bloquear controles si está bloqueado
  const handlePlay = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    if (isBlocked) {
      e.preventDefault()
      e.currentTarget.pause()
      setToast({
        message: 'Reproductor bloqueado por actividad sospechosa',
        type: 'error'
      })
    }
  }

  if (isBlocked) {
    return (
      <div className={`relative bg-black rounded-lg overflow-hidden ${className}`}>
        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}
        <div className="aspect-video flex items-center justify-center">
          <div className="text-center text-white p-8">
            <div className="mx-auto h-16 w-16 text-red-400 mb-4">
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium mb-2">Acceso Bloqueado</h3>
            <p className="text-sm text-gray-300 mb-4">
              Se ha detectado actividad sospechosa en tu cuenta.
            </p>
            <p className="text-xs text-gray-400">
              Si crees que esto es un error, contacta al soporte técnico.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`relative ${className}`}>
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
      
      {/* Indicador de seguimiento */}
      {isTracking && (
        <div className="absolute top-2 right-2 z-10">
          <div className="bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded flex items-center">
            <div className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></div>
            Sesión activa
          </div>
        </div>
      )}

      <video
        ref={videoRef}
        src={src}
        poster={poster}
        controls
        onPlay={handlePlay}
        className="w-full h-full rounded-lg"
        preload="metadata"
        controlsList="nodownload"
        onContextMenu={(e) => e.preventDefault()} // Prevenir menú contextual
      >
        Tu navegador no soporta el elemento de video.
      </video>

      {/* Overlay de carga */}
      {!isTracking && !error && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-lg">
          <div className="text-white text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
            <p className="text-sm">Iniciando sesión...</p>
          </div>
        </div>
      )}
    </div>
  )
}
