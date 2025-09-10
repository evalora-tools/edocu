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
    let timeoutId: NodeJS.Timeout
    let subscription: any

    // Limpiar sesión al cerrar pestaña/navegador
    const handleBeforeUnload = () => {
      supabase.auth.signOut()
      sessionStorage.clear()
    }

    // Agregar event listener para limpiar sesión
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', handleBeforeUnload)
    }

    const initializeAuth = async () => {
      try {
        console.log('🔍 Iniciando AuthContext...')
        
        // Verificar si estamos en el navegador
        if (typeof window === 'undefined') {
          console.log('⚠️ Ejecutándose en servidor, saltando...')
          return
        }
        
        console.log('🌐 Ejecutándose en cliente, continuando...')
        
        // Pequeña pausa para asegurar hidratación completa
        await new Promise(resolve => setTimeout(resolve, 50))
        
        console.log('📡 Obteniendo sesión de Supabase...')
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('❌ Error getting session:', error)
          if (mounted) {
            setUser(null)
            setProfile(null)
            setAcademia(null)
            setInitialized(true)
            setLoading(false)
          }
          return
        }
        
        console.log('✅ Sesión obtenida:', session?.user?.id ? 'Usuario logueado' : 'Sin usuario')
        
        if (!mounted) return
        
        if (session?.user) {
          console.log('👤 Usuario encontrado, cargando perfil...')
          setUser(session.user)
          
          try {
            const { data: profileData, error: profileError } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .single()

            if (profileError) {
              console.error('❌ Error cargando perfil:', profileError)
              throw profileError
            }
            
            console.log('✅ Perfil cargado:', profileData.role, profileData.academia_id)
            
            let academiaData = null
            if (profileData.academia_id) {
              console.log('🏫 Cargando academia...')
              const { data: academia } = await supabase
                .from('academias')
                .select('*')
                .eq('id', profileData.academia_id)
                .single()
              academiaData = academia
              console.log('✅ Academia cargada:', academia?.nombre)
            }

            if (!mounted) return
            
            setProfile(profileData)
            setAcademia(academiaData)
            
            console.log('🎯 Configurando redirección...')
            
            // Dar tiempo para que la página se cargue antes de redirigir
            timeoutId = setTimeout(() => {
              if (!mounted) return
              
              const currentPath = window?.location.pathname
              console.log('📍 Ruta actual:', currentPath, 'Rol:', profileData.role)
              
              if (currentPath === '/login') {
                console.log('🔄 Redirigiendo desde login...')
                redirectToRolePage(profileData.role)
              } else if (currentPath !== '/' && !currentPath.startsWith(`/${profileData.role}`)) {
                const rolePages = ['/admin', '/gestor', '/profesor', '/alumno']
                const isRolePage = rolePages.some(page => currentPath.startsWith(page))
                
                if (isRolePage) {
                  console.log('🔄 Redirigiendo a página correcta de rol...')
                  redirectToRolePage(profileData.role)
                }
              }
            }, 100)
          } catch (profileError) {
            console.error('❌ Error loading profile:', profileError)
            if (mounted) {
              setUser(null)
              setProfile(null)
              setAcademia(null)
            }
          }
        } else {
          console.log('🚫 Sin usuario, limpiando estado...')
          setUser(null)
          setProfile(null)
          setAcademia(null)
          
          timeoutId = setTimeout(() => {
            if (!mounted) return
            const currentPath = window?.location.pathname
            console.log('📍 Sin usuario, ruta actual:', currentPath)
            if (currentPath !== '/login' && currentPath !== '/') {
              console.log('🔄 Redirigiendo a login...')
              router.push('/login')
            }
          }, 100)
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
          console.log('✅ AuthContext inicializado')
          setInitialized(true)
          setLoading(false)
        }
      }
    }

    const redirectToRolePage = (role: string) => {
      if (role === 'admin') {
        router.push('/admin')
      } else if (role === 'gestor') {
        router.push('/gestor')
      } else if (role === 'profesor') {
        router.push('/profesor')
      } else if (role === 'alumno') {
        router.push('/alumno')
      } else {
        router.push('/')
      }
    }

    initializeAuth()

    // Configurar listener de cambios de auth
    const authSubscription = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return

      console.log('Auth state change:', event, session?.user?.id)

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
          redirectToRolePage(profileData.role)
        }
      } else {
        setUser(null)
        setProfile(null)
        setAcademia(null)
        const currentPath = window?.location.pathname
        if (currentPath !== '/login' && currentPath !== '/') {
          router.push('/login')
        }
      }
    })

    subscription = authSubscription.data.subscription

    return () => {
      mounted = false
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
      if (subscription) {
        subscription.unsubscribe()
      }
      // Limpiar event listener
      if (typeof window !== 'undefined') {
        window.removeEventListener('beforeunload', handleBeforeUnload)
      }
    }
  }, [router])

  const signIn = async (email: string, password: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        await supabase.auth.signOut()
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