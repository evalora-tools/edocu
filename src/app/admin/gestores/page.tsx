'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Toast from '@/components/ui/Toast'

interface Academia {
  id: string
  nombre: string
  activa: boolean
}

interface Gestor {
  id: string
  nombre: string
  email: string
  academia_id: string
  created_at: string
  academias: Academia
}

export default function GestoresPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [gestores, setGestores] = useState<Gestor[]>([])
  const [academias, setAcademias] = useState<Academia[]>([])
  const [showModal, setShowModal] = useState(false)
  const [editingGestor, setEditingGestor] = useState<Gestor | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    password: '',
    academia_id: ''
  })

  useEffect(() => {
    const init = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          router.replace('/login')
          return
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single()

        if (!profile || profile.role !== 'admin') {
          router.replace('/')
          return
        }

        await Promise.all([loadGestores(), loadAcademias()])
      } catch (err) {
        console.error('Error inicializando:', err)
      } finally {
        setLoading(false)
      }
    }

    init()
  }, [router])

  const loadGestores = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          nombre,
          email,
          academia_id,
          created_at,
          academias!inner (
            id,
            nombre,
            activa
          )
        `)
        .eq('role', 'gestor')
        .order('created_at', { ascending: false })

      if (error) throw error
      
      // Transform data to match expected type
      const transformedData = data?.map((item: any) => ({
        ...item,
        academias: Array.isArray(item.academias) ? item.academias[0] : item.academias
      })) || []
      
      setGestores(transformedData)
    } catch (err) {
      console.error('Error cargando gestores:', err)
    }
  }

  const loadAcademias = async () => {
    try {
      const { data, error } = await supabase
        .from('academias')
        .select('id, nombre, activa')
        .eq('activa', true)
        .order('nombre')

      if (error) throw error
      setAcademias(data || [])
    } catch (err) {
      console.error('Error cargando academias:', err)
    }
  }

  const handleSubmit = async (e: any) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    try {
      if (editingGestor) {
        // Actualizar gestor existente
        const { error } = await supabase
          .from('profiles')
          .update({
            nombre: formData.nombre,
            email: formData.email,
            academia_id: formData.academia_id
          })
          .eq('id', editingGestor.id)

        if (error) throw error
        setToast({ message: 'Gestor actualizado correctamente', type: 'success' })
      } else {
        // Crear nuevo gestor usando la API temporal
        const response = await fetch('/api/admin/create-gestor-temp', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: formData.email,
            password: formData.password,
            nombre: formData.nombre,
            academia_id: formData.academia_id
          }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Error al crear el gestor')
        }

        setToast({ message: 'Gestor creado correctamente', type: 'success' })
      }

      await loadGestores()
      setShowModal(false)
      setEditingGestor(null)
      setFormData({ nombre: '', email: '', password: '', academia_id: '' })
    } catch (err: any) {
      console.error('Error guardando gestor:', err)
      setToast({ 
        message: err.message || 'Error al guardar el gestor', 
        type: 'error' 
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEdit = (gestor: Gestor) => {
    setEditingGestor(gestor)
    setFormData({
      nombre: gestor.nombre,
      email: gestor.email,
      password: '', // No mostramos la contraseña actual
      academia_id: gestor.academia_id
    })
    setShowModal(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este gestor? Esta acción no se puede deshacer.')) return

    try {
      // Eliminar el perfil (el usuario de Auth se mantiene)
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', id)

      if (error) throw error
      
      setToast({ message: 'Gestor eliminado correctamente', type: 'success' })
      await loadGestores()
    } catch (err: any) {
      console.error('Error eliminando gestor:', err)
      setToast({ 
        message: err.message || 'Error al eliminar el gestor', 
        type: 'error' 
      })
    }
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
                  onClick={() => router.push('/admin/academias')}
                  className="text-gray-600 hover:text-green-600 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <h1 className="text-3xl font-bold text-gray-900">Gestores de Academia</h1>
              </div>
              <p className="mt-2 text-gray-600">Administra los gestores de cada academia</p>
            </div>
            <button
              onClick={() => {
                setEditingGestor(null)
                setFormData({ nombre: '', email: '', password: '', academia_id: '' })
                setShowModal(true)
              }}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Nuevo Gestor
            </button>
          </div>
        </div>

        <div className="bg-white shadow-lg rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Gestor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Academia
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado Academia
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha Creación
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {gestores.map((gestor: Gestor) => (
                  <tr key={gestor.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{gestor.nombre}</div>
                        <div className="text-sm text-gray-500">{gestor.email}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {gestor.academias?.nombre || 'Sin academia'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        gestor.academias?.activa
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {gestor.academias?.activa ? 'Activa' : 'Inactiva'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(gestor.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleEdit(gestor)}
                          className="text-blue-600 hover:text-blue-900 transition-colors"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleDelete(gestor.id)}
                          className="text-red-600 hover:text-red-900 transition-colors"
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {gestores.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                      No hay gestores creados todavía
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
                {editingGestor ? 'Editar Gestor' : 'Nuevo Gestor'}
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
                {!editingGestor && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Contraseña *
                    </label>
                    <input
                      type="password"
                      required={!editingGestor}
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
                    Academia *
                  </label>
                  <select
                    required
                    value={formData.academia_id}
                    onChange={(e) => setFormData({ ...formData, academia_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="">Seleccionar academia</option>
                    {academias.map((academia) => (
                      <option key={academia.id} value={academia.id}>
                        {academia.nombre}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false)
                      setEditingGestor(null)
                      setFormData({ nombre: '', email: '', password: '', academia_id: '' })
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
                      ? (editingGestor ? 'Actualizando...' : 'Creando...') 
                      : (editingGestor ? 'Actualizar' : 'Crear')
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
