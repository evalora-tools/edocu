'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
// import { useAuth } from '@/contexts/AuthContext'
import Toast from '@/components/ui/Toast'

interface Curso {
  id: string
  nombre: string
}


interface Alumno {
  id: string
  nombre: string
  email: string
  cursos_adquiridos?: string[]
  created_at: string
}

export default function GestorAlumnosPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<any>(null)
  const [academia, setAcademia] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [alumnos, setAlumnos] = useState<Alumno[]>([])
  const [filteredAlumnos, setFilteredAlumnos] = useState<Alumno[]>([])
  const [cursos, setCursos] = useState<Curso[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingAlumno, setEditingAlumno] = useState<Alumno | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    password: '',
    cursos_ids: [] as string[]
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
          .select('role, academia_id')
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

        await Promise.all([
          loadAlumnos(profileData.academia_id),
          loadCursos(profileData.academia_id)
        ])
      } catch (err) {
        console.error('Error inicializando:', err)
      } finally {
        setLoading(false)
      }
    }

    init()
  }, [router])

  // Efecto para filtrar alumnos por término de búsqueda
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredAlumnos(alumnos)
    } else {
      const filtered = alumnos.filter(alumno =>
        alumno.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        alumno.email.toLowerCase().includes(searchTerm.toLowerCase())
      )
      setFilteredAlumnos(filtered)
    }
  }, [searchTerm, alumnos])

  const loadAlumnos = async (academiaId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, nombre, email, cursos_adquiridos, created_at')
        .eq('academia_id', academiaId)
        .eq('role', 'alumno')
        .order('created_at', { ascending: false })

      if (error) throw error
      setAlumnos(data || [])
      setFilteredAlumnos(data || [])
    } catch (err) {
      console.error('Error cargando alumnos:', err)
    }
  }

  const loadCursos = async (academiaId: string) => {
    try {
      const { data, error } = await supabase
        .from('cursos')
        .select('id, nombre')
        .eq('academia_id', academiaId)
        .order('nombre')

      if (error) throw error
      setCursos(data || [])
    } catch (err) {
      console.error('Error cargando cursos:', err)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    try {
      if (editingAlumno) {
        // Actualizar alumno existente
        const { error } = await supabase
          .from('profiles')
          .update({
            nombre: formData.nombre,
            email: formData.email,
            cursos_adquiridos: formData.cursos_ids
          })
          .eq('id', editingAlumno.id)

        if (error) throw error
        setToast({ message: 'Alumno actualizado correctamente', type: 'success' })
      } else {
        // Crear nuevo alumno usando la API
        const response = await fetch('/api/admin/create-student', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'same-origin',
          body: JSON.stringify({
            email: formData.email,
            password: formData.password,
            nombre: formData.nombre,
            cursos_ids: formData.cursos_ids,
            academia_id: profile?.academia_id
          }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Error al crear el alumno')
        }

        setToast({ message: 'Alumno creado correctamente', type: 'success' })
      }

      await loadAlumnos(profile?.academia_id || '')
      setShowModal(false)
      setEditingAlumno(null)
      setFormData({ nombre: '', email: '', password: '', cursos_ids: [] })
    } catch (err: any) {
      console.error('Error guardando alumno:', err)
      setToast({ 
        message: err.message || 'Error al guardar el alumno', 
        type: 'error' 
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEdit = (alumno: Alumno) => {
    setEditingAlumno(alumno)
    setFormData({
      nombre: alumno.nombre,
      email: alumno.email,
      password: '',
      cursos_ids: alumno.cursos_adquiridos || []
    })
    setShowModal(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este alumno?')) return

    try {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', id)

      if (error) throw error
      
      setToast({ message: 'Alumno eliminado correctamente', type: 'success' })
      await loadAlumnos(profile?.academia_id || '')
    } catch (err: any) {
      console.error('Error eliminando alumno:', err)
      setToast({ 
        message: err.message || 'Error al eliminar el alumno', 
        type: 'error' 
      })
    }
  }

  const getCursosNombres = (cursosIds: string[] = []) => {
    if (cursosIds.length === 0) return 'Sin cursos'
    
    const nombresCompletos = cursosIds.map(id => {
      const curso = cursos.find(c => c.id === id)
      return curso ? curso.nombre : 'Curso no encontrado'
    })
    
    if (nombresCompletos.length > 2) {
      return `${nombresCompletos.slice(0, 2).join(', ')} y ${nombresCompletos.length - 2} más`
    }
    
    return nombresCompletos.join(', ')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Cargando...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow-lg rounded-xl p-8 mb-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <div className="flex items-center gap-4 mb-2">
                <button
                  onClick={() => router.push('/gestor')}
                  className="text-gray-600 hover:text-green-600 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <h1 className="text-3xl font-bold text-gray-900">Gestión de Alumnos</h1>
              </div>
              <p className="mt-2 text-gray-600">
                Academia: {academia?.nombre}
              </p>
            </div>
            <button
              onClick={() => {
                setEditingAlumno(null)
                setFormData({ nombre: '', email: '', password: '', cursos_ids: [] })
                setShowModal(true)
              }}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Nuevo Alumno
            </button>
          </div>
        </div>

        {/* Buscador */}
        <div className="bg-white shadow-lg rounded-xl p-6 mb-6">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Buscar alumno por nombre o email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400 hover:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
          {searchTerm && (
            <p className="mt-2 text-sm text-gray-600">
              Mostrando {filteredAlumnos.length} de {alumnos.length} alumnos
            </p>
          )}
        </div>

        <div className="bg-white shadow-lg rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Alumno
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cursos
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha Registro
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredAlumnos.map((alumno) => (
                  <tr key={alumno.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{alumno.nombre}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {alumno.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className="bg-gray-100 px-2 py-1 rounded-full text-xs">
                        {getCursosNombres(alumno.cursos_adquiridos)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(alumno.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleEdit(alumno)}
                          className="text-blue-600 hover:text-blue-900 transition-colors"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleDelete(alumno.id)}
                          className="text-red-600 hover:text-red-900 transition-colors"
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredAlumnos.length === 0 && alumnos.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                      No hay alumnos registrados todavía
                    </td>
                  </tr>
                )}
                {filteredAlumnos.length === 0 && alumnos.length > 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                      No se encontraron alumnos que coincidan con "{searchTerm}"
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4">
                {editingAlumno ? 'Editar Alumno' : 'Nuevo Alumno'}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
                {!editingAlumno && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Contraseña *
                    </label>
                    <input
                      type="password"
                      required={!editingAlumno}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      minLength={6}
                    />
                    <p className="text-xs text-gray-500 mt-1">Mínimo 6 caracteres</p>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cursos
                  </label>
                  <div className="max-h-32 overflow-y-auto border border-gray-300 rounded-lg p-2 space-y-1">
                    {cursos.map((curso) => (
                      <label key={curso.id} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={formData.cursos_ids.includes(curso.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData({
                                ...formData,
                                cursos_ids: [...formData.cursos_ids, curso.id]
                              })
                            } else {
                              setFormData({
                                ...formData,
                                cursos_ids: formData.cursos_ids.filter(id => id !== curso.id)
                              })
                            }
                          }}
                          className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                        />
                        <span className="text-sm text-gray-700">{curso.nombre}</span>
                      </label>
                    ))}
                    {cursos.length === 0 && (
                      <p className="text-sm text-gray-500">No hay cursos disponibles</p>
                    )}
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false)
                      setEditingAlumno(null)
                      setFormData({ nombre: '', email: '', password: '', cursos_ids: [] })
                    }}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isSubmitting 
                      ? (editingAlumno ? 'Actualizando...' : 'Creando...') 
                      : (editingAlumno ? 'Actualizar' : 'Crear')
                    }
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Toast de notificaciones */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  )
}
