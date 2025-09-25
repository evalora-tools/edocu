'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function GestorPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<any>(null)
  const [academia, setAcademia] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    profesores: 0,
    alumnos: 0,
    cursos: 0
  })

  useEffect(() => {
    const init = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          router.replace('/login')
          return
        }

        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()

        if (!profileData || profileData.role !== 'gestor') {
          router.replace('/')
          return
        }

        setProfile(profileData)

        if (profileData.academia_id) {
          const { data: academiaData } = await supabase
            .from('academias')
            .select('*')
            .eq('id', profileData.academia_id)
            .single()
          setAcademia(academiaData)
        }

        await loadStats(profileData.academia_id)
      } catch (err) {
        console.error('Error inicializando:', err)
      } finally {
        setLoading(false)
      }
    }

    init()
  }, [router])

  const loadStats = async (academiaId: string) => {
    try {
      // Contar profesores
      const { count: profesoresCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('academia_id', academiaId)
        .eq('role', 'profesor')

      // Contar alumnos
      const { count: alumnosCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('academia_id', academiaId)
        .eq('role', 'alumno')

      // Contar cursos
      const { count: cursosCount } = await supabase
        .from('cursos')
        .select('*', { count: 'exact', head: true })
        .eq('academia_id', academiaId)

      setStats({
        profesores: profesoresCount || 0,
        alumnos: alumnosCount || 0,
        cursos: cursosCount || 0
      })
    } catch (err) {
      console.error('Error cargando estadísticas:', err)
    }
  }


  const signOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-100 via-blue-50 to-cyan-25 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando panel de gestión...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-100 via-blue-50 to-cyan-25">
      {/* Navigation Header */}
      <div className="backdrop-blur-md bg-white/80 shadow-md border-b border-white/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center">
                  <span className="text-white font-medium text-sm">
                    {academia?.nombre?.charAt(0).toUpperCase() || 'G'}
                  </span>
                </div>
              </div>
              <div className="ml-4">
                <h1 className="text-xl font-medium text-gray-900">{academia?.nombre || 'Academia'}</h1>
                <p className="text-sm text-gray-500">Panel de Gestión</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-blue-900 font-medium">
                Hola, {profile?.nombre}
              </span>
              <button
                onClick={signOut}
                className="text-sm text-blue-700 hover:text-blue-900 font-semibold"
              >
                Cerrar Sesión
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-white/30">
            <div className="flex items-center">
              <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
              </div>
              <div className="ml-6">
                <h3 className="text-sm font-medium text-gray-500 uppercase">Profesores</h3>
                <p className="text-3xl font-bold text-gray-900 mt-1">{stats.profesores}</p>
              </div>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-white/30">
            <div className="flex items-center">
              <div className="p-4 rounded-2xl bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                </svg>
              </div>
              <div className="ml-6">
                <h3 className="text-sm font-medium text-gray-500 uppercase">Alumnos</h3>
                <p className="text-3xl font-bold text-gray-900 mt-1">{stats.alumnos}</p>
              </div>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-white/30">
            <div className="flex items-center">
              <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-lg">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <div className="ml-6">
                <h3 className="text-sm font-medium text-gray-500 uppercase">Cursos</h3>
                <p className="text-3xl font-bold text-gray-900 mt-1">{stats.cursos}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div 
            onClick={() => router.push('/gestor/profesores')}
            className="group bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-8 hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 cursor-pointer border border-white/30"
          >
            <div className="text-center">
              <div className="relative mb-6">
                <div className="p-6 rounded-3xl bg-gradient-to-r from-blue-500 to-blue-600 text-white mx-auto w-20 h-20 flex items-center justify-center shadow-lg group-hover:shadow-xl group-hover:scale-110 transition-all duration-300">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                  </svg>
                </div>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Gestionar Profesores</h3>
              <p className="text-gray-600 text-sm leading-relaxed">Añadir, editar y administrar profesores de tu academia</p>
              <div className="mt-4 inline-flex items-center text-blue-600 font-medium text-sm group-hover:text-blue-700">
                Administrar
                <svg className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </div>

          <div 
            onClick={() => router.push('/gestor/alumnos')}
            className="group bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-8 hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 cursor-pointer border border-white/30"
          >
            <div className="text-center">
              <div className="relative mb-6">
                <div className="p-6 rounded-3xl bg-gradient-to-r from-green-500 to-green-600 text-white mx-auto w-20 h-20 flex items-center justify-center shadow-lg group-hover:shadow-xl group-hover:scale-110 transition-all duration-300">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                  </svg>
                </div>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Gestionar Alumnos</h3>
              <p className="text-gray-600 text-sm leading-relaxed">Añadir, editar y administrar alumnos de tu academia</p>
              <div className="mt-4 inline-flex items-center text-green-600 font-medium text-sm group-hover:text-green-700">
                Administrar
                <svg className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </div>

          <div 
            onClick={() => router.push('/gestor/cursos')}
            className="group bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-8 hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 cursor-pointer border border-white/30"
          >
            <div className="text-center">
              <div className="relative mb-6">
                <div className="p-6 rounded-3xl bg-gradient-to-r from-purple-500 to-purple-600 text-white mx-auto w-20 h-20 flex items-center justify-center shadow-lg group-hover:shadow-xl group-hover:scale-110 transition-all duration-300">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Gestionar Cursos</h3>
              <p className="text-gray-600 text-sm leading-relaxed">Crear y administrar cursos de tu academia</p>
              <div className="mt-4 inline-flex items-center text-purple-600 font-medium text-sm group-hover:text-purple-700">
                Administrar
                <svg className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
