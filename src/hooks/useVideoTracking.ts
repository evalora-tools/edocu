import { useEffect, useRef, useState, useCallback } from 'react'

interface VideoTrackingOptions {
  contenidoId: string
  duracionVideo?: number
  onSuspiciousActivity?: (reason: string) => void
  onWarning?: (message: string) => void
}

interface VideoSession {
  id: string
  session_id: string
  activa: boolean
}

export const useVideoTracking = (options: VideoTrackingOptions) => {
  const [session, setSession] = useState<VideoSession | null>(null)
  const [isTracking, setIsTracking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const sessionIdRef = useRef<string | null>(null)
  const lastTimeRef = useRef<number>(0)
  const playStartTimeRef = useRef<number>(0)
  const totalWatchedTimeRef = useRef<number>(0)
  const isPlayingRef = useRef<boolean>(false)
  const updateIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Función para obtener información del cliente
  const getClientInfo = useCallback(() => {
    return {
      user_agent: navigator.userAgent,
      ip_address: null // Se obtendrá en el servidor
    }
  }, [])

  // Función para iniciar sesión de tracking
  const startSession = useCallback(async () => {
    try {
      const clientInfo = getClientInfo()
      
      const response = await fetch('/api/video/start-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contenido_id: options.contenidoId,
          duracion_video: options.duracionVideo,
          ...clientInfo
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        if (response.status === 429) {
          // Actividad sospechosa detectada
          options.onSuspiciousActivity?.(errorData.reason)
          throw new Error(errorData.reason)
        }
        throw new Error(errorData.error || 'Error iniciando sesión')
      }

      const data = await response.json()
      setSession(data.session)
      sessionIdRef.current = data.session.session_id
      
      if (data.warning) {
        options.onWarning?.(data.warning)
      }

      return data.session
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido'
      setError(message)
      throw err
    }
  }, [options])

  // Función para enviar eventos de video
  const trackEvent = useCallback(async (
    eventType: 'play' | 'pause' | 'seek' | 'ended' | 'close',
    timestampVideo: number,
    metadata?: any
  ) => {
    if (!sessionIdRef.current) return

    try {
      await fetch('/api/video/track-event', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          session_id: sessionIdRef.current,
          event_type: eventType,
          timestamp_video: timestampVideo,
          metadata
        }),
      })
    } catch (err) {
      console.error('Error tracking event:', err)
    }
  }, [])

  // Función para actualizar tiempo de visualización acumulado
  const updateWatchTime = useCallback(async () => {
    if (!sessionIdRef.current) return

    try {
      await fetch('/api/video/update-time', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          session_id: sessionIdRef.current,
          tiempo_visualizado: totalWatchedTimeRef.current
        }),
      })
    } catch (err) {
      console.error('Error updating watch time:', err)
    }
  }, [])

  // Función para calcular tiempo transcurrido desde el último play
  const calculateAndAddWatchTime = useCallback(() => {
    if (isPlayingRef.current && videoRef.current) {
      const currentVideoTime = videoRef.current.currentTime
      const timeElapsed = currentVideoTime - playStartTimeRef.current
      
      // Solo agregar tiempo si es positivo y razonable (máximo 10 segundos para evitar saltos)
      if (timeElapsed > 0 && timeElapsed <= 10) {
        totalWatchedTimeRef.current += timeElapsed
      }
      
      playStartTimeRef.current = currentVideoTime
    }
  }, [])

  // Función para adjuntar eventos al elemento de video
  const attachToVideo = useCallback((videoElement: HTMLVideoElement) => {
    videoRef.current = videoElement

    const handlePlay = () => {
      const currentTime = Math.floor(videoElement.currentTime)
      trackEvent('play', currentTime)
      
      isPlayingRef.current = true
      playStartTimeRef.current = videoElement.currentTime
      
      // Iniciar actualizaciones periódicas del tiempo
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current)
      }
      updateIntervalRef.current = setInterval(() => {
        calculateAndAddWatchTime()
        updateWatchTime()
      }, 3000) // Actualizar cada 3 segundos
    }

    const handlePause = () => {
      const currentTime = Math.floor(videoElement.currentTime)
      trackEvent('pause', currentTime)
      
      // Calcular tiempo antes de pausar
      calculateAndAddWatchTime()
      isPlayingRef.current = false
      
      // Detener actualizaciones periódicas
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current)
        updateIntervalRef.current = null
      }
      
      // Enviar actualización final
      updateWatchTime()
    }

    const handleSeeked = () => {
      const currentTime = Math.floor(videoElement.currentTime)
      trackEvent('seek', currentTime, {
        previousTime: lastTimeRef.current
      })
      
      // Reiniciar tracking desde la nueva posición
      if (isPlayingRef.current) {
        playStartTimeRef.current = videoElement.currentTime
      }
      lastTimeRef.current = currentTime
    }

    const handleEnded = () => {
      const currentTime = Math.floor(videoElement.currentTime)
      trackEvent('ended', currentTime)
      
      // Calcular tiempo final
      calculateAndAddWatchTime()
      isPlayingRef.current = false
      
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current)
        updateIntervalRef.current = null
      }
      
      // Enviar actualización final
      updateWatchTime()
    }

    // Adjuntar event listeners
    videoElement.addEventListener('play', handlePlay)
    videoElement.addEventListener('pause', handlePause)
    videoElement.addEventListener('seeked', handleSeeked)
    videoElement.addEventListener('ended', handleEnded)

    // Cleanup function
    return () => {
      videoElement.removeEventListener('play', handlePlay)
      videoElement.removeEventListener('pause', handlePause)
      videoElement.removeEventListener('seeked', handleSeeked)
      videoElement.removeEventListener('ended', handleEnded)
    }
  }, [trackEvent, updateWatchTime])

  // Función para finalizar sesión
  const endSession = useCallback(async () => {
    if (sessionIdRef.current && videoRef.current) {
      const currentTime = Math.floor(videoRef.current.currentTime)
      
      // Calcular tiempo final si estaba reproduciéndose
      calculateAndAddWatchTime()
      
      await trackEvent('close', currentTime)
      
      // Enviar actualización final del tiempo
      await updateWatchTime()
    }

    // Limpiar intervalos
    if (updateIntervalRef.current) {
      clearInterval(updateIntervalRef.current)
      updateIntervalRef.current = null
    }
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current)
      heartbeatIntervalRef.current = null
    }

    setSession(null)
    sessionIdRef.current = null
    setIsTracking(false)
    
    // Resetear contadores
    totalWatchedTimeRef.current = 0
    isPlayingRef.current = false
  }, [trackEvent, calculateAndAddWatchTime, updateWatchTime])

  // Inicializar tracking cuando se monta el componente
  useEffect(() => {
    if (options.contenidoId && !session) {
      startSession()
        .then(() => setIsTracking(true))
        .catch(() => setIsTracking(false))
    }
  }, [options.contenidoId, session, startSession])

  // Cleanup al desmontar
  useEffect(() => {
    return () => {
      endSession()
    }
  }, [endSession])

  // Heartbeat para mantener la sesión activa
  useEffect(() => {
    if (isTracking && sessionIdRef.current) {
      heartbeatIntervalRef.current = setInterval(() => {
        if (videoRef.current && !videoRef.current.paused) {
          calculateAndAddWatchTime()
          updateWatchTime()
        }
      }, 30000) // Heartbeat cada 30 segundos
    }

    return () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current)
      }
    }
  }, [isTracking, updateWatchTime, calculateAndAddWatchTime])

  // Detectar cuando el usuario sale de la página
  useEffect(() => {
    const handleBeforeUnload = () => {
      endSession()
    }

    const handleVisibilityChange = () => {
      if (document.hidden && videoRef.current && !videoRef.current.paused) {
        // Usuario cambió de pestaña mientras el video estaba reproduciéndose
        const currentTime = Math.floor(videoRef.current.currentTime)
        trackEvent('pause', currentTime, { reason: 'tab_hidden' })
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [endSession, trackEvent])

  return {
    session,
    isTracking,
    error,
    attachToVideo,
    endSession,
    trackEvent
  }
}
