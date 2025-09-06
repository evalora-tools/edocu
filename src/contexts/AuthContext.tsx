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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [academia, setAcademia] = useState<Academia | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    let mounted = true

    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        
        if (!mounted) return
        
        if (session?.user) {
          setUser(session.user)
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single()

          if (profileError) throw profileError
          
          let academiaData = null
          if (profileData.academia_id) {
            const { data: academia } = await supabase
              .from('academias')
              .select('*')
              .eq('id', profileData.academia_id)
              .single()
            academiaData = academia
          }

          if (!mounted) return
          
          setProfile(profileData)
          setAcademia(academiaData)
          
          if (window?.location.pathname === '/login') {
            if (profileData.role === 'admin') {
              router.push('/admin')
            } else if (profileData.role === 'gestor') {
              router.push('/gestor')
            } else if (profileData.role === 'profesor') {
              router.push('/profesor')
            } else if (profileData.role === 'alumno') {
              router.push('/alumno')
            } else {
              router.push('/')
            }
          }
        } else {
          setUser(null)
          setProfile(null)
          setAcademia(null)
          if (window?.location.pathname !== '/login') {
            router.push('/login')
          }
        }
      } catch (error) {
        console.error('Error checking session:', error)
        setUser(null)
        setProfile(null)
        setAcademia(null)
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    checkSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return

      if (session?.user) {
        setUser(session.user)
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()

        if (profileError) {
          console.error('Error fetching profile:', profileError)
          setProfile(null)
          setAcademia(null)
          return
        }

        let academiaData = null
        if (profileData.academia_id) {
          const { data: academia } = await supabase
            .from('academias')
            .select('*')
            .eq('id', profileData.academia_id)
            .single()
          academiaData = academia
        }

        setProfile(profileData)
        setAcademia(academiaData)

        const currentPath = window?.location.pathname
        if (event === 'SIGNED_IN' || currentPath === '/login') {
          if (profileData.role === 'admin') {
            router.push('/admin')
          } else if (profileData.role === 'gestor') {
            router.push('/gestor')
          } else if (profileData.role === 'profesor') {
            router.push('/profesor')
          } else if (profileData.role === 'alumno') {
            router.push('/alumno')
          } else {
            router.push('/')
          }
        }
      } else {
        setUser(null)
        setProfile(null)
        setAcademia(null)
        if (window?.location.pathname !== '/login') {
          router.push('/login')
        }
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [router])

  const signIn = async (email: string, password: string) => {
    try {
      // Solo cerrar sesión si hay una activa
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        await supabase.auth.signOut()
        // Pequeña pausa después del signOut para evitar rate limiting
        await new Promise(resolve => setTimeout(resolve, 500))
      }
      
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      })
      
      if (error) {
        handleSupabaseError(error)
      }
    } catch (error: any) {
      console.error('Error en signIn:', error)
      throw error
    }
  }

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      router.push('/login')
    } catch (error) {
      console.error('Error en signOut:', error)
      throw error
    }
  }

  const isAdmin = profile?.role === 'admin'

  return (
    <AuthContext.Provider value={{ user, profile, academia, loading, signIn, signOut, isAdmin }}>
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