'use client'

import { useState } from 'react'

interface ClearSessionsButtonProps {
  onSuccess?: () => void
  className?: string
}

export default function ClearSessionsButton({ 
  onSuccess, 
  className = '' 
}: ClearSessionsButtonProps) {
  const [isClearing, setIsClearing] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const clearSessions = async () => {
    setIsClearing(true)
    setMessage(null)

    try {
      const response = await fetch('/api/video/cleanup-sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error('Error al limpiar sesiones')
      }

      setMessage('Sesiones limpiadas correctamente')
      onSuccess?.()
    } catch (error) {
      setMessage('Error al limpiar sesiones')
      console.error('Error:', error)
    } finally {
      setIsClearing(false)
      setTimeout(() => setMessage(null), 3000)
    }
  }

  return (
    <div className="flex flex-col items-center space-y-2">
      <button
        onClick={clearSessions}
        disabled={isClearing}
        className={`px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      >
        {isClearing ? (
          <>
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Limpiando...
          </>
        ) : (
          'Limpiar Sesiones de Video'
        )}
      </button>
      
      {message && (
        <p className={`text-sm ${message.includes('Error') ? 'text-red-600' : 'text-green-600'}`}>
          {message}
        </p>
      )}
      
      <p className="text-xs text-gray-500 text-center max-w-xs">
        Si tienes problemas para abrir videos, este botón cierra todas las sesiones activas
      </p>
    </div>
  )
}
