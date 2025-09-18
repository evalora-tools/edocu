'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { supabase, handleSupabaseError } from '@/lib/supabase'
import { User } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'

interface Academia {
  id: string
  nombre: string
  descripcion?: string
  logo_url?: string
  dominio?: string
  configuracion?: any
  activa: boolean
}

interface UserProfile {
  id: string
  role: string
  nombre: string
  email: string
  academia_id: string
  cursos_adquiridos: string[] | null
  cursos_asignados: string[] | null
  created_at: string
}

interface AuthContextType {
  user: User | null
  profile: UserProfile | null
  academia: Academia | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  isAdmin: boolean
  initialized: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [academia, setAcademia] = useState<Academia | null>(null)
  const [loading, setLoading] = useState(true)
  const [initialized, setInitialized] = useState(false)
  const router = useRouter()

  useEffect(() => {
    let mounted = true
    let subscription: any

    const initializeAuth = async () => {
      try {
        console.log('🔍 Iniciando AuthContext...')
        
        // Verificar si estamos en el navegador
        if (typeof window === 'undefined') {
          console.log('⚠️ Ejecutándose en servidor, saltando...')
          return
        }
        
        // Obtener sesión actual
        const { data: { session } } = await supabase.auth.getSession()
        
        if (!mounted) return
        
        if (session?.user) {
          console.log('👤 Usuario encontrado:', session.user.email)
          setUser(session.user)
          await loadUserProfile(session.user.id)
        } else {
          console.log('� Sin usuario logueado')
          setUser(null)
          setProfile(null)
          setAcademia(null)
        }
      } catch (error) {
        console.error('❌ Error initializing auth:', error)
        if (mounted) {
          setUser(null)
          setProfile(null)
          setAcademia(null)
        }
      } finally {
        if (mounted) {
          setInitialized(true)
          setLoading(false)
        }
      }
    }

    const loadUserProfile = async (userId: string) => {
      try {
        console.log('🔍 Cargando perfil para usuario:', userId)
        
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single()

        if (profileError || !profileData) {
          console.error('❌ Error cargando perfil:', profileError)
          return
        }

        console.log('✅ Perfil cargado:', profileData.role)
        setProfile(profileData)

        // Cargar academia si existe
        if (profileData.academia_id) {
          const { data: academiaData } = await supabase
            .from('academias')
            .select('*')
            .eq('id', profileData.academia_id)
            .single()
          
          if (academiaData) {
            console.log('✅ Academia cargada:', academiaData.nombre)
            setAcademia(academiaData)
          }
        }
      } catch (error) {
        console.error('❌ Error loading profile:', error)
      }
    }

    initializeAuth()

    // Listener simplificado para cambios de auth
    const authSubscription = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return

      console.log('🔄 Auth state change:', event)

      if (session?.user) {
        setUser(session.user)
        await loadUserProfile(session.user.id)
      } else {
        setUser(null)
        setProfile(null)
        setAcademia(null)
      }
    })

    subscription = authSubscription.data.subscription

    return () => {
      mounted = false
      if (subscription) {
        subscription.unsubscribe()
      }
    }
  }, [])

  const signIn = async (email: string, password: string) => {
    try {
      console.log('🔐 SignIn llamado desde AuthContext para:', email)
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })
      
      if (error) {
        console.error('❌ Error en signIn:', error)
        handleSupabaseError(error)
      }
      
      console.log('✅ SignIn exitoso desde AuthContext')
      
    } catch (error: any) {
      console.error('❌ Error en signIn:', error)
      throw error
    }
  }

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      
      // Limpiar storage manual
      sessionStorage.clear()
      
      // Limpiar estados
      setUser(null)
      setProfile(null)
      setAcademia(null)
      
      router.push('/login')
    } catch (error) {
      console.error('Error en signOut:', error)
      throw error
    }
  }

  const isAdmin = profile?.role === 'admin'

  return (
    <AuthContext.Provider value={{ user, profile, academia, loading, signIn, signOut, isAdmin, initialized }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}