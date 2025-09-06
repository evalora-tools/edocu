'use client'

import { useEffect, useRef } from 'react'
import { useVideoTracking } from '@/hooks/useVideoTracking'

interface Props {
  contenidoId: string
  duracionVideo: number
}

export default function VideoTestPlayer({ contenidoId, duracionVideo }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const { attachToVideo, isTracking, error } = useVideoTracking({
    contenidoId,
    duracionVideo,
    onSuspiciousActivity: (reason) => {
      console.log('Actividad sospechosa:', reason)
    },
    onWarning: (message) => {
      console.log('Advertencia:', message)
    }
  })

  useEffect(() => {
    if (videoRef.current && isTracking) {
      const cleanup = attachToVideo(videoRef.current)
      return cleanup
    }
  }, [attachToVideo, isTracking])

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
      <h3 className="text-lg font-medium mb-4">Video de Prueba</h3>
      
      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded">
          Error: {error}
        </div>
      )}
      
      <div className="mb-4">
        <video
          ref={videoRef}
          controls
          width="400"
          height="225"
          className="border border-gray-300 rounded"
        >
          <source src="https://www.w3schools.com/html/mov_bbb.mp4" type="video/mp4" />
          Tu navegador no soporta el elemento video.
        </video>
      </div>
      
      <div className="text-sm text-gray-600">
        <p>Contenido ID: {contenidoId}</p>
        <p>Duración: {duracionVideo} segundos</p>
        <p>Estado tracking: {isTracking ? 'Activo' : 'Inactivo'}</p>
      </div>
    </div>
  )
}
