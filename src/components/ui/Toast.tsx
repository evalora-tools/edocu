'use client'

import { useEffect, useState } from 'react'

interface ToastProps {
  message: string
  type: 'success' | 'error' | 'warning'
  duration?: number
  onClose: () => void
}

export default function Toast({ message, type, duration = 3000, onClose }: ToastProps) {
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false)
      setTimeout(onClose, 300) // Esperar a que termine la animación
    }, duration)

    return () => clearTimeout(timer)
  }, [duration, onClose])

  const baseStyles = "fixed top-4 right-4 p-4 rounded-lg shadow-lg transform transition-all duration-300 z-50"
  const typeStyles = type === 'success' 
    ? "bg-green-500 text-white"
    : type === 'warning'
    ? "bg-yellow-500 text-white"
    : "bg-red-500 text-white"
  const visibilityStyles = isVisible
    ? "translate-y-0 opacity-100"
    : "translate-y-[-1rem] opacity-0"

  return (
    <div className={`${baseStyles} ${typeStyles} ${visibilityStyles}`}>
      <div className="flex items-center">
        {type === 'success' ? (
          <svg className="w-6 h-6 mr-2" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
            <path d="M5 13l4 4L19 7"></path>
          </svg>
        ) : (
          <svg className="w-6 h-6 mr-2" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
            <path d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        )}
        <p className="font-medium">{message}</p>
      </div>
    </div>
  )
}