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


interface Profesor {
  id: string
  nombre: string
  email: string
  cursos_asignados?: string[]
  created_at: string
}

export default function GestorProfesoresPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<any>(null)
  const [academia, setAcademia] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [profesores, setProfesores] = useState<Profesor[]>([])
  const [cursos, setCursos] = useState<Curso[]>([])
  const [showModal, setShowModal] = useState(false)
  const [editingProfesor, setEditingProfesor] = useState<Profesor | null>(null)
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
          loadProfesores(profileData.academia_id),
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

  const loadProfesores = async (academiaId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, nombre, email, cursos_asignados, created_at')
        .eq('academia_id', academiaId)
        .eq('role', 'profesor')
        .order('created_at', { ascending: false })

      if (error) throw error
      setProfesores(data || [])
    } catch (err) {
      console.error('Error cargando profesores:', err)
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
      if (editingProfesor) {
        // Actualizar profesor existente
        const { error } = await supabase
          .from('profiles')
          .update({
            nombre: formData.nombre,
            email: formData.email,
            cursos_asignados: formData.cursos_ids
          })
          .eq('id', editingProfesor.id)

        if (error) throw error
        setToast({ message: 'Profesor actualizado correctamente', type: 'success' })
      } else {
        // Crear nuevo profesor usando la API
        const response = await fetch('/api/admin/create-profesor', {
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
          throw new Error(errorData.error || 'Error al crear el profesor')
        }

        setToast({ message: 'Profesor creado correctamente', type: 'success' })
      }

      await loadProfesores(profile?.academia_id || '')
      setShowModal(false)
      setEditingProfesor(null)
      setFormData({ nombre: '', email: '', password: '', cursos_ids: [] })
    } catch (err: any) {
      console.error('Error guardando profesor:', err)
      setToast({ 
        message: err.message || 'Error al guardar el profesor', 
        type: 'error' 
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEdit = (profesor: Profesor) => {
    setEditingProfesor(profesor)
    setFormData({
      nombre: profesor.nombre,
      email: profesor.email,
      password: '',
      cursos_ids: profesor.cursos_asignados || []
    })
    setShowModal(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este profesor?')) return

    try {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', id)

      if (error) throw error
      
      setToast({ message: 'Profesor eliminado correctamente', type: 'success' })
      await loadProfesores(profile?.academia_id || '')
    } catch (err: any) {
      console.error('Error eliminando profesor:', err)
      setToast({ 
        message: err.message || 'Error al eliminar el profesor', 
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
                  className="text-gray-600 hover:text-blue-600 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <h1 className="text-3xl font-bold text-gray-900">Gestión de Profesores</h1>
              </div>
              <p className="mt-2 text-gray-600">
                Academia: {academia?.nombre}
              </p>
            </div>
            <button
              onClick={() => {
                setEditingProfesor(null)
                setFormData({ nombre: '', email: '', password: '', cursos_ids: [] })
                setShowModal(true)
              }}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Nuevo Profesor
            </button>
          </div>
        </div>

        <div className="bg-white shadow-lg rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Profesor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cursos Asignados
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
                {profesores.map((profesor) => (
                  <tr key={profesor.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{profesor.nombre}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {profesor.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className="bg-blue-100 px-2 py-1 rounded-full text-xs">
                        {getCursosNombres(profesor.cursos_asignados)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(profesor.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleEdit(profesor)}
                          className="text-blue-600 hover:text-blue-900 transition-colors"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleDelete(profesor.id)}
                          className="text-red-600 hover:text-red-900 transition-colors"
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {profesores.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                      No hay profesores registrados todavía
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
                {editingProfesor ? 'Editar Profesor' : 'Nuevo Profesor'}
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                {!editingProfesor && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Contraseña *
                    </label>
                    <input
                      type="password"
                      required={!editingProfesor}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      minLength={6}
                    />
                    <p className="text-xs text-gray-500 mt-1">Mínimo 6 caracteres</p>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cursos Asignados
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
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
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
                      setEditingProfesor(null)
                      setFormData({ nombre: '', email: '', password: '', cursos_ids: [] })
                    }}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isSubmitting 
                      ? (editingProfesor ? 'Actualizando...' : 'Creando...') 
                      : (editingProfesor ? 'Actualizar' : 'Crear')
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
