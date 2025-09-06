'use client'

import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function Home() {
  const { user, profile, loading, signOut, isAdmin } = useAuth()
  const router = useRouter()

  useEffect(() => {
    const redirectUser = async () => {
      if (!loading) {
        if (!user) {
          router.replace('/login')
          return
        }
        
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

          if (profile?.role === 'admin') {
            router.replace('/admin')
          } else if (profile?.role === 'profesor') {
            router.replace('/profesor')
          } else if (profile?.role === 'alumno') {
            router.replace('/alumno')
          }
        } catch (error) {
          console.error('Error al obtener el perfil:', error)
          router.replace('/login')
        }
      }
    }

    redirectUser()
  }, [loading, user, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Cargando...</div>
      </div>
    )
  }

  if (!user) {
    return null // No mostramos nada mientras se realiza la redirección
  }

  return (
    <div className="min-h-screen flex flex-col">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <h1 className="text-2xl font-bold">Academia Castiñeira</h1>
            {!loading && (
              <div className="flex items-center gap-4">
                {user && (
                  <>
                    <span className="text-sm text-gray-600">
                      {profile?.email} 
                      {profile?.role === 'admin' && <span className="ml-2 text-blue-600 font-medium">(Admin)</span>}
                      {profile?.role === 'profesor' && <span className="ml-2 text-purple-600 font-medium">(Profesor)</span>}
                      {profile?.role === 'alumno' && <span className="ml-2 text-green-600 font-medium">(Alumno)</span>}
                    </span>
                    {profile?.role === 'admin' && (
                      <Link 
                        href="/admin"
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                      >
                        Panel Admin
                      </Link>
                    )}
                    {profile?.role === 'profesor' && (
                      <Link 
                        href="/profesor"
                        className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
                      >
                        Panel Profesor
                      </Link>
                    )}
                    <button 
                      onClick={() => signOut()}
                      className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                    >
                      Cerrar sesión
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </nav>

      <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">Tus cursos al alcance</h2>
          <p className="text-gray-600">Accede a todo el contenido de tus asignaturas</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Tarjetas de cursos... */}
        </div>
      </main>

      <footer className="bg-white border-t mt-auto">
        <div className="max-w-7xl mx-auto px-4 py-6 text-center text-gray-600">
          © {new Date().getFullYear()} Academia Castiñeira. Todos los derechos reservados.
        </div>
      </footer>
    </div>
  )
}