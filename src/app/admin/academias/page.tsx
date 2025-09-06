'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Toast from '@/components/ui/Toast'

interface Academia {
  id: string
  nombre: string
  descripcion?: string
  logo_url?: string
  dominio?: string
  configuracion?: any
  activa: boolean
  created_at: string
}

export default function AcademiasPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [academias, setAcademias] = useState<Academia[]>([])
  const [showModal, setShowModal] = useState(false)
  const [editingAcademia, setEditingAcademia] = useState<Academia | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    dominio: '',
    activa: true
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

        await loadAcademias()
      } catch (err) {
        console.error('Error inicializando:', err)
      } finally {
        setLoading(false)
      }
    }

    init()
  }, [router])

  const loadAcademias = async () => {
    try {
      const { data, error } = await supabase
        .from('academias')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setAcademias(data || [])
    } catch (err) {
      console.error('Error cargando academias:', err)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    try {
      if (editingAcademia) {
        const { error } = await supabase
          .from('academias')
          .update({
            nombre: formData.nombre,
            descripcion: formData.descripcion || null,
            dominio: formData.dominio || null,
            activa: formData.activa,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingAcademia.id)

        if (error) throw error
        setToast({ message: 'Academia actualizada correctamente', type: 'success' })
      } else {
        const { error } = await supabase
          .from('academias')
          .insert({
            nombre: formData.nombre,
            descripcion: formData.descripcion || null,
            dominio: formData.dominio || null,
            activa: formData.activa
          })

        if (error) throw error
        setToast({ message: 'Academia creada correctamente', type: 'success' })
      }

      await loadAcademias()
      setShowModal(false)
      setEditingAcademia(null)
      setFormData({ nombre: '', descripcion: '', dominio: '', activa: true })
    } catch (err: any) {
      console.error('Error guardando academia:', err)
      setToast({ 
        message: err.message || 'Error al guardar la academia', 
        type: 'error' 
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEdit = (academia: Academia) => {
    setEditingAcademia(academia)
    setFormData({
      nombre: academia.nombre,
      descripcion: academia.descripcion || '',
      dominio: academia.dominio || '',
      activa: academia.activa
    })
    setShowModal(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta academia? Esta acción no se puede deshacer.')) return

    try {
      // Verificar si la academia tiene usuarios o cursos asociados
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id')
        .eq('academia_id', id)
        .limit(1)

      const { data: cursos } = await supabase
        .from('cursos')
        .select('id')
        .eq('academia_id', id)
        .limit(1)

      if (profiles && profiles.length > 0) {
        setToast({ 
          message: 'No se puede eliminar: la academia tiene usuarios asociados', 
          type: 'error' 
        })
        return
      }

      if (cursos && cursos.length > 0) {
        setToast({ 
          message: 'No se puede eliminar: la academia tiene cursos asociados', 
          type: 'error' 
        })
        return
      }

      const { error } = await supabase
        .from('academias')
        .delete()
        .eq('id', id)

      if (error) throw error
      
      setToast({ message: 'Academia eliminada correctamente', type: 'success' })
      await loadAcademias()
    } catch (err: any) {
      console.error('Error eliminando academia:', err)
      setToast({ 
        message: err.message || 'Error al eliminar la academia', 
        type: 'error' 
      })
    }
  }

  const toggleActiva = async (academia: Academia) => {
    try {
      const { error } = await supabase
        .from('academias')
        .update({ 
          activa: !academia.activa,
          updated_at: new Date().toISOString()
        })
        .eq('id', academia.id)

      if (error) throw error
      
      setToast({ 
        message: `Academia ${!academia.activa ? 'activada' : 'desactivada'} correctamente`, 
        type: 'success' 
      })
      await loadAcademias()
    } catch (err: any) {
      console.error('Error actualizando estado:', err)
      setToast({ 
        message: err.message || 'Error al actualizar el estado', 
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
                  onClick={() => router.push('/admin')}
                  className="text-gray-600 hover:text-green-600 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <h1 className="text-3xl font-bold text-gray-900">Gestión de Academias</h1>
              </div>
              <p className="mt-2 text-gray-600">Administra las academias del sistema</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => router.push('/admin/gestores')}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
                Gestores
              </button>
              <button
                onClick={() => {
                  setEditingAcademia(null)
                  setFormData({ nombre: '', descripcion: '', dominio: '', activa: true })
                  setShowModal(true)
                }}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Nueva Academia
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white shadow-lg rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Academia
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Dominio
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
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
                {academias.map((academia) => (
                  <tr key={academia.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{academia.nombre}</div>
                        {academia.descripcion && (
                          <div className="text-sm text-gray-500">{academia.descripcion}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {academia.dominio || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => toggleActiva(academia)}
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          academia.activa
                            ? 'bg-green-100 text-green-800 hover:bg-green-200'
                            : 'bg-red-100 text-red-800 hover:bg-red-200'
                        } transition-colors`}
                      >
                        {academia.activa ? 'Activa' : 'Inactiva'}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(academia.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleEdit(academia)}
                          className="text-blue-600 hover:text-blue-900 transition-colors"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleDelete(academia.id)}
                          className="text-red-600 hover:text-red-900 transition-colors"
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
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
                {editingAcademia ? 'Editar Academia' : 'Nueva Academia'}
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
                    Descripción
                  </label>
                  <textarea
                    value={formData.descripcion}
                    onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Dominio
                  </label>
                  <input
                    type="text"
                    value={formData.dominio}
                    onChange={(e) => setFormData({ ...formData, dominio: e.target.value })}
                    placeholder="ejemplo.com"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="activa"
                    checked={formData.activa}
                    onChange={(e) => setFormData({ ...formData, activa: e.target.checked })}
                    className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                  />
                  <label htmlFor="activa" className="ml-2 block text-sm text-gray-900">
                    Academia activa
                  </label>
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false)
                      setEditingAcademia(null)
                      setFormData({ nombre: '', descripcion: '', dominio: '', activa: true })
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
                      ? (editingAcademia ? 'Actualizando...' : 'Creando...') 
                      : (editingAcademia ? 'Actualizar' : 'Crear')
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
