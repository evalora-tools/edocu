'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'

export default function Home() {
  const { user, profile, loading, initialized } = useAuth()
  const router = useRouter()
  const [loadingState, setLoadingState] = useState<string>('Iniciando...')

  useEffect(() => {
    if (!initialized) {
      setLoadingState('Inicializando...')
      return
    }

    if (loading) {
      setLoadingState('Verificando sesión...')
      return
    }

    if (!user) {
      setLoadingState('Redirigiendo al login...')
      setTimeout(() => {
        router.replace('/login')
      }, 500)
      return
    }

    if (!profile) {
      setLoadingState('Cargando perfil...')
      return
    }

    if (profile) {
      setLoadingState('Redirigiendo a tu panel...')
      
      setTimeout(() => {
        if (profile.role === 'admin') {
          router.replace('/admin')
        } else if (profile.role === 'gestor') {
          router.replace('/gestor')
        } else if (profile.role === 'profesor') {
          router.replace('/profesor')
        } else if (profile.role === 'alumno') {
          router.replace('/alumno')
        } else {
          router.replace('/login')
        }
      }, 500)
    }
  }, [loading, initialized, user, profile, router])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-8 flex items-center gap-4 border border-white/30">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <div className="text-lg font-medium text-gray-700">{loadingState}</div>
      </div>
    </div>
  )
}