'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import Toast from '@/components/ui/Toast'

interface Profesor {
  id: string
  nombre: string
}

interface Curso {
  id: string
  nombre: string
  universidad: string
  curso_academico: string
  profesor_id?: string
  created_at: string
  profesores?: Profesor
}

export default function GestorCursosPage() {
  const router = useRouter()
  const { profile, academia } = useAuth()
  const [loading, setLoading] = useState(true)
  const [cursos, setCursos] = useState<Curso[]>([])
  const [profesores, setProfesores] = useState<Profesor[]>([])
  const [showModal, setShowModal] = useState(false)
  const [editingCurso, setEditingCurso] = useState<Curso | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [formData, setFormData] = useState({
    nombre: '',
    universidad: '',
    curso_academico: 'primero',
    profesor_id: ''
  })

  const cursosAcademicos = [
    { id: 'primero', nombre: 'Primer curso' },
    { id: 'segundo', nombre: 'Segundo curso' },
    { id: 'tercero', nombre: 'Tercer curso' },
    { id: 'cuarto', nombre: 'Cuarto curso' },
  ]

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
          .select('role, academia_id')
          .eq('id', session.user.id)
          .single()

        if (!profile || profile.role !== 'gestor') {
          router.replace('/')
          return
        }

        await Promise.all([
          loadCursos(profile.academia_id),
          loadProfesores(profile.academia_id)
        ])
      } catch (err) {
        console.error('Error inicializando:', err)
      } finally {
        setLoading(false)
      }
    }

    init()
  }, [router])

  const loadCursos = async (academiaId: string) => {
    try {
      const { data, error } = await supabase
        .from('cursos')
        .select(`
          id,
          nombre,
          universidad,
          curso_academico,
          profesor_id,
          created_at,
          profesores:profiles!profesor_id (
            id,
            nombre
          )
        `)
        .eq('academia_id', academiaId)
        .order('created_at', { ascending: false })

      if (error) throw error
      
      // Transform data to match expected type - convert profesores array to single object
      const transformedData = data?.map((curso: any) => ({
        ...curso,
        profesores: Array.isArray(curso.profesores) && curso.profesores.length > 0 
          ? curso.profesores[0] 
          : curso.profesores
      })) || []
      
      setCursos(transformedData)
    } catch (err) {
      console.error('Error cargando cursos:', err)
    }
  }

  const loadProfesores = async (academiaId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, nombre')
        .eq('academia_id', academiaId)
        .eq('role', 'profesor')
        .order('nombre')

      if (error) throw error
      setProfesores(data || [])
    } catch (err) {
      console.error('Error cargando profesores:', err)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    try {
      if (editingCurso) {
        // Actualizar curso existente
        const { error } = await supabase
          .from('cursos')
          .update({
            nombre: formData.nombre,
            universidad: formData.universidad,
            curso_academico: formData.curso_academico,
            profesor_id: formData.profesor_id || null
          })
          .eq('id', editingCurso.id)

        if (error) throw error
        setToast({ message: 'Curso actualizado correctamente', type: 'success' })
      } else {
        // Crear nuevo curso
        const { error } = await supabase
          .from('cursos')
          .insert({
            nombre: formData.nombre,
            universidad: formData.universidad,
            curso_academico: formData.curso_academico,
            profesor_id: formData.profesor_id || null,
            academia_id: profile?.academia_id
          })

        if (error) throw error
        setToast({ message: 'Curso creado correctamente', type: 'success' })
      }

      await loadCursos(profile?.academia_id || '')
      setShowModal(false)
      setEditingCurso(null)
      setFormData({ nombre: '', universidad: '', curso_academico: 'primero', profesor_id: '' })
    } catch (err: any) {
      console.error('Error guardando curso:', err)
      setToast({ 
        message: err.message || 'Error al guardar el curso', 
        type: 'error' 
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEdit = (curso: Curso) => {
    setEditingCurso(curso)
    setFormData({
      nombre: curso.nombre,
      universidad: curso.universidad,
      curso_academico: curso.curso_academico,
      profesor_id: curso.profesor_id || ''
    })
    setShowModal(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este curso?')) return

    try {
      const { error } = await supabase
        .from('cursos')
        .delete()
        .eq('id', id)

      if (error) throw error
      
      setToast({ message: 'Curso eliminado correctamente', type: 'success' })
      await loadCursos(profile?.academia_id || '')
    } catch (err: any) {
      console.error('Error eliminando curso:', err)
      setToast({ 
        message: err.message || 'Error al eliminar el curso', 
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
                  onClick={() => router.push('/gestor')}
                  className="text-gray-600 hover:text-purple-600 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <h1 className="text-3xl font-bold text-gray-900">Gestión de Cursos</h1>
              </div>
              <p className="mt-2 text-gray-600">
                Academia: {academia?.nombre}
              </p>
            </div>
            <button
              onClick={() => {
                setEditingCurso(null)
                setFormData({ nombre: '', universidad: '', curso_academico: 'primero', profesor_id: '' })
                setShowModal(true)
              }}
              className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Nuevo Curso
            </button>
          </div>
        </div>

        <div className="bg-white shadow-lg rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Curso
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Universidad
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Año Académico
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Profesor
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
                {cursos.map((curso) => (
                  <tr key={curso.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{curso.nombre}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {curso.universidad}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {cursosAcademicos.find(ca => ca.id === curso.curso_academico)?.nombre || curso.curso_academico}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {curso.profesores?.nombre || 'Sin asignar'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(curso.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleEdit(curso)}
                          className="text-blue-600 hover:text-blue-900 transition-colors"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleDelete(curso.id)}
                          className="text-red-600 hover:text-red-900 transition-colors"
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {cursos.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                      No hay cursos creados todavía
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
                {editingCurso ? 'Editar Curso' : 'Nuevo Curso'}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre del Curso *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Ej: Matemáticas I"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Universidad *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.universidad}
                    onChange={(e) => setFormData({ ...formData, universidad: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Ej: Universidad de Santiago"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Año Académico *
                  </label>
                  <select
                    required
                    value={formData.curso_academico}
                    onChange={(e) => setFormData({ ...formData, curso_academico: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    {cursosAcademicos.map((curso) => (
                      <option key={curso.id} value={curso.id}>
                        {curso.nombre}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Profesor Asignado
                  </label>
                  <select
                    value={formData.profesor_id}
                    onChange={(e) => setFormData({ ...formData, profesor_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="">Sin asignar</option>
                    {profesores.map((profesor) => (
                      <option key={profesor.id} value={profesor.id}>
                        {profesor.nombre}
                      </option>
                    ))}
                  </select>
                  {profesores.length === 0 && (
                    <p className="text-xs text-gray-500 mt-1">
                      No hay profesores disponibles. Crea profesores primero.
                    </p>
                  )}
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false)
                      setEditingCurso(null)
                      setFormData({ nombre: '', universidad: '', curso_academico: 'primero', profesor_id: '' })
                    }}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isSubmitting 
                      ? (editingCurso ? 'Actualizando...' : 'Creando...') 
                      : (editingCurso ? 'Actualizar' : 'Crear')
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
