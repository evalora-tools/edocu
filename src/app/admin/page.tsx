'use client'

import { useEffect, useState, ChangeEvent } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Toast from '@/components/ui/Toast'

interface Curso {
  id: string
  nombre: string
  universidad: string
  curso_academico: string
  profesor_id: string | null
}

interface Usuario {
  id: string
  nombre: string
  email: string
  role: 'admin' | 'profesor' | 'alumno'
  cursos_asignados?: string[]
  cursos_adquiridos?: string[]
}

export default function AdminPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [cursos, setCursos] = useState<Curso[]>([])
  const [usuarios, setUsuarios] = useState<{ profesores: Usuario[]; alumnos: Usuario[] }>({ profesores: [], alumnos: [] })
  const [showNewCourseModal, setShowNewCourseModal] = useState(false)
  const [showNewStudentModal, setShowNewStudentModal] = useState(false)
  const [showNewProfesorModal, setShowNewProfesorModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showEditCourseModal, setShowEditCourseModal] = useState(false)
  const [editingUser, setEditingUser] = useState<Usuario | null>(null)
  const [editingCourse, setEditingCourse] = useState<Curso | null>(null)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [expandedSections, setExpandedSections] = useState({
    cursos: true,
    profesores: true,
    alumnos: true
  })
  const [showMenu, setShowMenu] = useState(false)
  const [formData, setFormData] = useState<{
    nombre: string;
    universidad: string;
    curso_academico: string;
    email: string;
    password: string;
    cursos_ids: string[];
  }>({
    nombre: '',
    universidad: '',
    curso_academico: 'primero',
    email: '',
    password: '',
    cursos_ids: [] as string[]
  })

  const cursosAcademicos = [
    { id: 'primero', nombre: 'Primer curso' },
    { id: 'segundo', nombre: 'Segundo curso' },
    { id: 'tercero', nombre: 'Tercer curso' },
    { id: 'cuarto', nombre: 'Cuarto curso' },
    { id: 'otro', nombre: 'Otro' }
  ]

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      // Cerrar menú principal
      if (!target.closest('.menu-button') && !target.closest('.menu-content')) {
        setShowMenu(false);
      }
      
      // Cerrar menús de acciones
      if (!target.closest('button')) {
        const menus = document.querySelectorAll('[id^="alumno-menu-"], [id^="profesor-menu-"]');
        menus.forEach(menu => {
          if (!menu.contains(target)) {
            menu.classList.add('hidden');
          }
        });
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        
        if (!session) {
          setLoading(false)
          router.replace('/login')
          return
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single()

        if (!profile || profile.role !== 'admin') {
          setLoading(false)
          router.replace('/')
          return
        }

        // Redirigir automáticamente a la gestión de academias
        router.replace('/admin/academias')
        return

      } catch (error) {
        console.error('Error:', error)
        router.replace('/login')
      }
    }

    checkAdmin()
  }, [router])

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: cursosData, error: cursosError } = await supabase
          .from('cursos')
          .select('*')
          .order('created_at', { ascending: false })
      
        if (cursosError) {
          console.error('Error cargando cursos:', cursosError)
          return
        }
        
        setCursos(cursosData || [])

        const { data: usuariosData, error: usuariosError } = await supabase
          .from('profiles')
          .select(`
            id,
            nombre,
            email,
            role,
            cursos_adquiridos,
            cursos_asignados
          `)
          .order('created_at', { ascending: false })

        if (usuariosError) {
          console.error('Error cargando usuarios:', usuariosError)
          return
        }
      
        const profesores = usuariosData?.filter(user => user.role === 'profesor') || []
        const alumnos = usuariosData?.filter(user => user.role === 'alumno') || []

        setUsuarios({ profesores, alumnos })
      } catch (error) {
        console.error('Error cargando datos:', error)
      }
    }

    fetchData()
  }, [])

  const handleEditCourse = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingCourse) return

    try {
      setIsLoading(true)
      const { error } = await supabase
        .from('cursos')
        .update({
          nombre: formData.nombre,
          universidad: formData.universidad,
          curso_academico: formData.curso_academico
        })
        .eq('id', editingCourse.id)

      if (error) throw error

      setCursos(cursos.map(curso => 
        curso.id === editingCourse.id 
          ? { 
              ...curso, 
              nombre: formData.nombre,
              universidad: formData.universidad,
              curso_academico: formData.curso_academico
            } 
          : curso
      ))

      setShowEditCourseModal(false)
      setEditingCourse(null)
      setFormData({ ...formData, nombre: '', universidad: '', curso_academico: 'primero' })
      setToast({
        message: 'Curso actualizado exitosamente',
        type: 'success'
      })
    } catch (error: any) {
      console.error('Error actualizando curso:', error)
      setToast({
        message: error.message || 'Error al actualizar el curso',
        type: 'error'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setIsLoading(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('No hay sesión activa')
      }

      const { data, error } = await supabase
        .from('cursos')
        .insert([
          {
            nombre: formData.nombre,
            universidad: formData.universidad,
            curso_academico: formData.curso_academico,
            profesor_id: session.user.id
          }
        ])
        .select()

      if (error) {
        console.error('Error detallado:', error)
        throw error
      }

      setCursos([...(data || []), ...cursos])
      setShowNewCourseModal(false)
      setFormData({ ...formData, nombre: '', universidad: '', curso_academico: 'primero' })
      setToast({
        message: `Curso ${formData.nombre} creado exitosamente.`,
        type: 'success'
      })
    } catch (error: any) {
      console.error('Error creando curso:', error)
      setToast({
        message: error.message || 'Error al crear el curso',
        type: 'error'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateProfesor = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setIsLoading(true)
      
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
          cursos_ids: formData.cursos_ids
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al crear el profesor')
      }

      setShowNewProfesorModal(false)
      setFormData({ ...formData, email: '', password: '', nombre: '', cursos_ids: [] })
      setToast({
        message: data.message || `Profesor ${formData.nombre} creado exitosamente. Se ha enviado un correo de verificación.`,
        type: 'success'
      })
    } catch (error: any) {
      console.error('Error creando profesor:', error)
      setToast({
        message: error.message || 'Error al crear el profesor',
        type: 'error'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteCourse = async (courseId: string, courseName: string) => {
    if (!confirm(`¿Estás seguro de que deseas eliminar el curso "${courseName}"?`)) {
      return;
    }

    try {
      setIsLoading(true);
      const { error } = await supabase
        .from('cursos')
        .delete()
        .eq('id', courseId);

      if (error) throw error;

      setCursos(cursos.filter(curso => curso.id !== courseId));
      setToast({
        message: `Curso "${courseName}" eliminado exitosamente`,
        type: 'success'
      });
    } catch (error: any) {
      console.error('Error eliminando curso:', error);
      setToast({
        message: error.message || 'Error al eliminar el curso',
        type: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string, userName: string, role: 'profesor' | 'alumno') => {
    if (!confirm(`¿Estás seguro de que deseas eliminar ${role === 'profesor' ? 'al profesor' : 'al alumno'} "${userName}"?`)) {
      return;
    }

    try {
      setIsLoading(true);
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId);

      if (error) throw error;

      setUsuarios(prev => ({
        ...prev,
        [role === 'profesor' ? 'profesores' : 'alumnos']: prev[role === 'profesor' ? 'profesores' : 'alumnos'].filter(user => user.id !== userId)
      }));

      setToast({
        message: `${role === 'profesor' ? 'Profesor' : 'Alumno'} "${userName}" eliminado exitosamente`,
        type: 'success'
      });
    } catch (error: any) {
      console.error('Error eliminando usuario:', error);
      setToast({
        message: error.message || `Error al eliminar ${role === 'profesor' ? 'al profesor' : 'al alumno'}`,
        type: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingUser) return

    try {
      setIsLoading(true)
      
      const { data, error } = await supabase
        .from('profiles')
        .update({
          nombre: formData.nombre,
          email: formData.email,
          ...(editingUser.role === 'profesor' 
            ? { cursos_asignados: formData.cursos_ids }
            : { cursos_adquiridos: formData.cursos_ids }
          )
        })
        .eq('id', editingUser.id)
        .select()

      if (error) throw error

      if (editingUser.role === 'profesor') {
        await supabase
          .from('cursos')
          .update({ profesor_id: null })
          .eq('profesor_id', editingUser.id)

        if (formData.cursos_ids.length > 0) {
          await supabase
            .from('cursos')
            .update({ profesor_id: editingUser.id })
            .in('id', formData.cursos_ids)
        }

        const { data: cursosData } = await supabase
          .from('cursos')
          .select('*')
          .order('created_at', { ascending: false })
        
        setCursos(cursosData || [])
      }

      setUsuarios(prev => {
        const isProfesor = editingUser.role === 'profesor'
        const listKey = isProfesor ? 'profesores' : 'alumnos'
        const updatedList = prev[listKey].map(user => 
          user.id === editingUser.id ? { 
            ...user, 
            nombre: formData.nombre,
            email: formData.email,
            ...(isProfesor 
              ? { cursos_asignados: formData.cursos_ids }
              : { cursos_adquiridos: formData.cursos_ids }
            )
          } : user
        )
        return {
          ...prev,
          [listKey]: updatedList
        }
      })

      setShowEditModal(false)
      setEditingUser(null)
      setFormData({ ...formData, nombre: '', email: '', cursos_ids: [] })
      setToast({
        message: 'Usuario actualizado exitosamente',
        type: 'success'
      })
    } catch (error: any) {
      console.error('Error actualizando usuario:', error)
      setToast({
        message: error.message || 'Error al actualizar el usuario',
        type: 'error'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setIsLoading(true)
      
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
          cursos_ids: formData.cursos_ids
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al crear el estudiante')
      }

      setShowNewStudentModal(false)
      setFormData({ ...formData, email: '', password: '', nombre: '', cursos_ids: [] })
      setToast({
        message: data.message || `Estudiante ${formData.nombre} creado exitosamente. Se ha enviado un correo de verificación.`,
        type: 'success'
      })
    } catch (error: any) {
      console.error('Error creando estudiante:', error)
      setToast({
        message: error.message || 'Error al crear el estudiante',
        type: 'error'
      })
    } finally {
      setIsLoading(false)
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
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-white shadow-lg rounded-xl p-8 mb-8 border border-gray-100">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-6">
            <div className="text-center sm:text-left">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Panel de Administración
              </h1>
              <p className="mt-2 text-gray-600">
                Gestiona cursos, profesores y alumnos
              </p>
            </div>
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="menu-button bg-white p-2 rounded-lg hover:bg-gray-50 border border-gray-200 shadow-sm transition-all duration-200"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-600" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                </svg>
              </button>

              {showMenu && (
                <div className="menu-content absolute right-0 mt-2 w-56 rounded-lg bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-50">
                  <div className="py-1">
                    <button
                      onClick={() => {
                        setShowNewCourseModal(true)
                        setShowMenu(false)
                      }}
                      className="group flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                      </svg>
                      Crear Curso
                    </button>
                    <button
                      onClick={() => {
                        setShowNewStudentModal(true)
                        setShowMenu(false)
                      }}
                      className="group flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-green-50 hover:text-green-700"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M8 9a3 3 0 100-6 3 3 0 000 6zM8 11a6 6 0 016 6H2a6 6 0 016-6zM16 7a1 1 0 10-2 0v1h-1a1 1 0 100 2h1v1a1 1 0 102 0v-1h1a1 1 0 100-2h-1V7z" />
                      </svg>
                      Añadir Estudiante
                    </button>
                    <button
                      onClick={() => {
                        setShowNewProfesorModal(true)
                        setShowMenu(false)
                      }}
                      className="group flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-700"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3 text-purple-500" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
                      </svg>
                      Añadir Profesor
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Lista de Cursos */}
        <div className="bg-white shadow-lg rounded-xl p-8 mb-8 border border-gray-100">
          <div 
            className="flex items-center justify-between cursor-pointer"
            onClick={() => setExpandedSections(prev => ({ ...prev, cursos: !prev.cursos }))}
          >
            <div className="flex items-center gap-3">
              <div className={`transform transition-transform duration-200 ${expandedSections.cursos ? 'rotate-90' : ''}`}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-800">Cursos</h2>
                <p className="text-gray-600 mt-1">Gestiona los cursos disponibles</p>
              </div>
            </div>
            <div className="text-sm text-gray-600 bg-gray-50 px-3 py-1 rounded-full">
              {cursos.length} cursos
            </div>
          </div>
          <div className={`grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 transition-all duration-300 ease-in-out overflow-hidden ${
            expandedSections.cursos ? 'mt-6 max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
          }`}>
            {cursos.map((curso) => (
              <div key={curso.id} className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-shadow duration-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-lg text-gray-800">{curso.nombre}</h3>
                  <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                    {cursosAcademicos.find(c => c.id === curso.curso_academico)?.nombre || curso.curso_academico}
                  </span>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center text-gray-600">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z" />
                      </svg>
                      {curso.universidad}
                    </div>
                    <div className="relative inline-block text-left">
                      <button
                        onClick={() => {
                          const menu = document.getElementById(`curso-menu-${curso.id}`);
                          if (menu) {
                            menu.classList.toggle('hidden');
                          }
                        }}
                        className="text-sm font-semibold text-blue-600 hover:text-blue-900 flex items-center gap-2"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                        </svg>
                      </button>
                      <div
                        id={`curso-menu-${curso.id}`}
                        className="hidden absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50"
                      >
                        <div className="py-1">
                          <button
                            onClick={() => {
                              const menu = document.getElementById(`curso-menu-${curso.id}`);
                              if (menu) {
                                menu.classList.add('hidden');
                              }
                              setEditingCourse(curso)
                              setFormData({
                                ...formData,
                                nombre: curso.nombre,
                                universidad: curso.universidad,
                                curso_academico: curso.curso_academico
                              })
                              setShowEditCourseModal(true)
                            }}
                            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                              <path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" />
                              <path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" />
                            </svg>
                            Editar datos
                          </button>
                          <button
                            onClick={() => {
                              const menu = document.getElementById(`curso-menu-${curso.id}`);
                              if (menu) {
                                menu.classList.add('hidden');
                              }
                              handleDeleteCourse(curso.id, curso.nombre)
                            }}
                            className="w-full text-left px-4 py-2 text-sm text-red-700 hover:bg-red-50 flex items-center gap-2"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                            Eliminar curso
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {cursos.length === 0 && (
              <div className="col-span-full text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                <p className="mt-2 text-gray-500">No hay cursos disponibles</p>
                <button
                  onClick={() => setShowNewCourseModal(true)}
                  className="mt-4 text-blue-600 hover:text-blue-700 font-medium"
                >
                  Añadir nuevo curso
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Lista de Profesores */}
        <div className="bg-white shadow-lg rounded-xl p-8 mb-8 border border-gray-100">
          <div 
            className="flex items-center justify-between cursor-pointer"
            onClick={() => setExpandedSections(prev => ({ ...prev, profesores: !prev.profesores }))}
          >
            <div className="flex items-center gap-3">
              <div className={`transform transition-transform duration-200 ${expandedSections.profesores ? 'rotate-90' : ''}`}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-800">Profesores</h2>
                <p className="text-gray-600 mt-1">Lista de profesores registrados</p>
              </div>
            </div>
            <div className="text-sm text-gray-600 bg-gray-50 px-3 py-1 rounded-full">
              {usuarios.profesores.length} profesores
            </div>
          </div>
          <div className={`transition-all duration-300 ease-in-out overflow-hidden ${
            expandedSections.profesores ? 'mt-6 max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
          }`}>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th scope="col" className="px-6 py-3 text-left">
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Nombre</span>
                    </th>
                    <th scope="col" className="px-6 py-3 text-left">
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Email</span>
                    </th>
                    <th scope="col" className="px-6 py-3 text-left">
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Cursos Asignados</span>
                    </th>
                    <th scope="col" className="px-6 py-3 text-right">
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Acciones</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {usuarios.profesores.map((profesor) => (
                    <tr key={profesor.id} className="hover:bg-gray-50 transition-colors duration-200">
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className="h-8 w-8 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center font-semibold text-sm">
                            {profesor.nombre.charAt(0).toUpperCase()}
                          </div>
                          <span className="ml-3 font-medium text-gray-900">{profesor.nombre}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">{profesor.email}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                          {profesor.cursos_asignados?.length || 0} cursos
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="relative inline-block text-left">
                          <button
                            onClick={() => {
                              const menu = document.getElementById(`profesor-menu-${profesor.id}`);
                              if (menu) {
                                menu.classList.toggle('hidden');
                              }
                            }}
                            className="text-sm font-semibold text-purple-600 hover:text-purple-900 flex items-center gap-2 pr-2"
                          >
                            <div className="flex items-center gap-1">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" />
                                <path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" />
                              </svg>
                              Modificar
                            </div>
                          </button>
                          <div
                            id={`profesor-menu-${profesor.id}`}
                            className="hidden absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50"
                          >
                            <div className="py-1">
                              <button
                                onClick={() => {
                                  const menu = document.getElementById(`profesor-menu-${profesor.id}`);
                                  if (menu) {
                                    menu.classList.add('hidden');
                                  }
                                  setEditingUser(profesor)
                                  setFormData({
                                    ...formData,
                                    nombre: profesor.nombre,
                                    email: profesor.email,
                                    cursos_ids: profesor.cursos_asignados || []
                                  })
                                  setShowEditModal(true)
                                }}
                                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                  <path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" />
                                  <path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" />
                                </svg>
                                Editar datos
                              </button>
                              <button
                                onClick={() => {
                                  const menu = document.getElementById(`profesor-menu-${profesor.id}`);
                                  if (menu) {
                                    menu.classList.add('hidden');
                                  }
                                  handleDeleteUser(profesor.id, profesor.nombre, 'profesor')
                                }}
                                className="w-full text-left px-4 py-2 text-sm text-red-700 hover:bg-red-50 flex items-center gap-2"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                                Eliminar profesor
                              </button>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {usuarios.profesores.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                          <p className="mt-2 text-gray-500">No hay profesores registrados</p>
                          <button
                            onClick={() => setShowNewProfesorModal(true)}
                            className="mt-4 text-purple-600 hover:text-purple-700 font-medium"
                          >
                            Añadir nuevo profesor
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Lista de Alumnos */}
        <div className="bg-white shadow-lg rounded-xl p-8 mb-8 border border-gray-100">
          <div 
            className="flex items-center justify-between cursor-pointer"
            onClick={() => setExpandedSections(prev => ({ ...prev, alumnos: !prev.alumnos }))}
          >
            <div className="flex items-center gap-3">
              <div className={`transform transition-transform duration-200 ${expandedSections.alumnos ? 'rotate-90' : ''}`}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-800">Alumnos</h2>
                <p className="text-gray-600 mt-1">Lista de alumnos matriculados</p>
              </div>
            </div>
            <div className="text-sm text-gray-600 bg-gray-50 px-3 py-1 rounded-full">
              {usuarios.alumnos.filter(alumno => 
                alumno.nombre.toLowerCase().includes(searchTerm.toLowerCase())
              ).length} alumnos
            </div>
          </div>
          <div className={`transition-all duration-300 ease-in-out overflow-hidden ${
            expandedSections.alumnos ? 'mt-6 max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
          }`}>
            <div className="mb-6">
              <div className="relative">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar alumno por nombre..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-200 focus:border-gray-300 transition-all duration-200"
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                  </svg>
                </div>
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                  >
                    <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th scope="col" className="px-6 py-3 text-left">
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Nombre</span>
                    </th>
                    <th scope="col" className="px-6 py-3 text-left">
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Email</span>
                    </th>
                    <th scope="col" className="px-6 py-3 text-left">
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Cursos Adquiridos</span>
                    </th>
                    <th scope="col" className="px-6 py-3 text-right">
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Acciones</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {usuarios.alumnos
                    .filter(alumno => alumno.nombre.toLowerCase().includes(searchTerm.toLowerCase()))
                    .map((alumno) => (
                    <tr key={alumno.id} className="hover:bg-gray-50 transition-colors duration-200">
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className="h-8 w-8 rounded-full bg-green-100 text-green-700 flex items-center justify-center font-semibold text-sm">
                            {alumno.nombre.charAt(0).toUpperCase()}
                          </div>
                          <span className="ml-3 font-medium text-gray-900">{alumno.nombre}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">{alumno.email}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          {alumno.cursos_adquiridos?.length || 0} cursos
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="relative inline-block text-left">
                          <button
                            onClick={() => {
                              const menu = document.getElementById(`alumno-menu-${alumno.id}`);
                              if (menu) {
                                menu.classList.toggle('hidden');
                              }
                            }}
                            className="text-sm font-semibold text-green-600 hover:text-green-900 flex items-center gap-2 pr-2"
                          >
                            <div className="flex items-center gap-1">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" />
                                <path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" />
                              </svg>
                              Modificar
                            </div>
                          </button>
                          <div
                            id={`alumno-menu-${alumno.id}`}
                            className="hidden absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50"
                          >
                            <div className="py-1">
                              <button
                                onClick={() => {
                                  const menu = document.getElementById(`alumno-menu-${alumno.id}`);
                                  if (menu) {
                                    menu.classList.add('hidden');
                                  }
                                  setEditingUser(alumno)
                                  setFormData({
                                    ...formData,
                                    nombre: alumno.nombre,
                                    email: alumno.email,
                                    cursos_ids: alumno.cursos_adquiridos || []
                                  })
                                  setShowEditModal(true)
                                }}
                                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                  <path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" />
                                  <path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" />
                                </svg>
                                Editar datos
                              </button>
                              <button
                                onClick={() => {
                                  const menu = document.getElementById(`alumno-menu-${alumno.id}`);
                                  if (menu) {
                                    menu.classList.add('hidden');
                                  }
                                  handleDeleteUser(alumno.id, alumno.nombre, 'alumno')
                                }}
                                className="w-full text-left px-4 py-2 text-sm text-red-700 hover:bg-red-50 flex items-center gap-2"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                                Eliminar alumno
                              </button>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {usuarios.alumnos.filter(alumno => alumno.nombre.toLowerCase().includes(searchTerm.toLowerCase())).length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                          </svg>
                          <p className="mt-2 text-gray-500">
                            {searchTerm 
                              ? `No se encontraron alumnos que coincidan con "${searchTerm}"`
                              : 'No hay alumnos registrados'
                            }
                          </p>
                          <button
                            onClick={() => setShowNewStudentModal(true)}
                            className="mt-4 text-green-600 hover:text-green-700 font-medium"
                          >
                            Añadir nuevo alumno
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Modales */}
        {/* Modal Nuevo Curso */}
        {showNewCourseModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-xl transform transition-all">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-blue-500 bg-clip-text text-transparent">
                  Crear Nuevo Curso
                </h2>
                <button
                  onClick={() => setShowNewCourseModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <form onSubmit={handleCreateCourse} className="space-y-6">
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Nombre</label>
                    <div className="relative rounded-lg shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3z" />
                        </svg>
                      </div>
                      <input
                        type="text"
                        value={formData.nombre}
                        onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                        className="pl-10 w-full rounded-lg border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200"
                        placeholder="Nombre del curso"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Universidad</label>
                    <div className="relative rounded-lg shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z" />
                        </svg>
                      </div>
                      <input
                        type="text"
                        value={formData.universidad}
                        onChange={(e) => setFormData({ ...formData, universidad: e.target.value })}
                        className="pl-10 w-full rounded-lg border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200"
                        placeholder="Nombre de la universidad"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Curso Académico</label>
                    <div className="relative rounded-lg shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <select
                        value={formData.curso_academico}
                        onChange={(e) => setFormData({ ...formData, curso_academico: e.target.value })}
                        className="pl-10 w-full rounded-lg border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200"
                        required
                      >
                        {cursosAcademicos.map((curso) => (
                          <option key={curso.id} value={curso.id}>
                            {curso.nombre}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
                <div className="flex justify-end space-x-3 pt-6">
                  <button
                    type="button"
                    onClick={() => setShowNewCourseModal(false)}
                    className="px-6 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-200 transition-all duration-200"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="px-6 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-blue-500 rounded-lg hover:from-blue-700 hover:to-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/30 hover:shadow-blue-500/40"
                  >
                    {isLoading ? (
                      <div className="flex items-center">
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Creando curso...
                      </div>
                    ) : 'Crear Curso'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal Nuevo Estudiante */}
        {showNewStudentModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-xl transform transition-all">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-bold bg-gradient-to-r from-green-600 to-green-500 bg-clip-text text-transparent">
                  Añadir Nuevo Estudiante
                </h2>
                <button
                  onClick={() => setShowNewStudentModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <form onSubmit={handleCreateStudent} className="space-y-6">
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Nombre</label>
                    <div className="relative rounded-lg shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <input
                        type="text"
                        value={formData.nombre}
                        onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                        className="pl-10 w-full rounded-lg border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all duration-200"
                        placeholder="Nombre completo"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                    <div className="relative rounded-lg shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                          <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                        </svg>
                      </div>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="pl-10 w-full rounded-lg border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all duration-200"
                        placeholder="correo@ejemplo.com"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Contraseña</label>
                    <div className="relative rounded-lg shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <input
                        type="password"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        className="pl-10 w-full rounded-lg border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all duration-200"
                        placeholder="••••••••"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">Cursos</label>
                    <div className="bg-white rounded-lg border border-gray-200">
                      <div className="max-h-64 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                        <div className="p-2 space-y-1">
                          {cursos.map((curso) => (
                            <label
                              key={curso.id}
                              className="flex items-center p-2 rounded-lg hover:bg-green-50 transition-colors cursor-pointer group"
                            >
                              <input
                                type="checkbox"
                                id={`curso-${curso.id}`}
                                value={curso.id}
                                checked={formData.cursos_ids.includes(curso.id)}
                                onChange={(e) => {
                                  const cursoId = curso.id;
                                  setFormData(prev => ({
                                    ...prev,
                                    cursos_ids: e.target.checked
                                      ? [...prev.cursos_ids, cursoId]
                                      : prev.cursos_ids.filter(id => id !== cursoId)
                                  }));
                                }}
                                className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded transition-colors"
                              />
                              <span className="ml-3 text-sm text-gray-700 group-hover:text-green-700 transition-colors">
                                {curso.nombre}
                              </span>
                            </label>
                          ))}
                          {cursos.length === 0 && (
                            <p className="text-sm text-gray-500 text-center py-2">
                              No hay cursos disponibles
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="p-2 border-t border-gray-100 bg-gray-50 text-xs text-gray-500 text-center">
                        {formData.cursos_ids.length} curso(s) seleccionado(s)
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex justify-end space-x-3 pt-6">
                  <button
                    type="button"
                    onClick={() => setShowNewStudentModal(false)}
                    className="px-6 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-200 transition-all duration-200"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="px-6 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-green-600 to-green-500 rounded-lg hover:from-green-700 hover:to-green-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-green-500/30 hover:shadow-green-500/40"
                  >
                    {isLoading ? (
                      <div className="flex items-center">
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Creando estudiante...
                      </div>
                    ) : 'Añadir Estudiante'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal Editar Curso */}
        {showEditCourseModal && editingCourse && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-xl transform transition-all">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-blue-500 bg-clip-text text-transparent">
                  Editar Curso
                </h2>
                <button
                  onClick={() => {
                    setShowEditCourseModal(false)
                    setEditingCourse(null)
                    setFormData({ ...formData, nombre: '', universidad: '', curso_academico: 'primero' })
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <form onSubmit={handleEditCourse} className="space-y-6">
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Nombre</label>
                    <div className="relative rounded-lg shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3z" />
                        </svg>
                      </div>
                      <input
                        type="text"
                        value={formData.nombre}
                        onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                        className="pl-10 w-full rounded-lg border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200"
                        placeholder="Nombre del curso"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Universidad</label>
                    <div className="relative rounded-lg shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z" />
                        </svg>
                      </div>
                      <input
                        type="text"
                        value={formData.universidad}
                        onChange={(e) => setFormData({ ...formData, universidad: e.target.value })}
                        className="pl-10 w-full rounded-lg border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200"
                        placeholder="Nombre de la universidad"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Curso Académico</label>
                    <div className="relative rounded-lg shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <select
                        value={formData.curso_academico}
                        onChange={(e) => setFormData({ ...formData, curso_academico: e.target.value })}
                        className="pl-10 w-full rounded-lg border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200"
                        required
                      >
                        {cursosAcademicos.map((curso) => (
                          <option key={curso.id} value={curso.id}>
                            {curso.nombre}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
                <div className="flex justify-end space-x-3 pt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditCourseModal(false)
                      setEditingCourse(null)
                      setFormData({ ...formData, nombre: '', universidad: '', curso_academico: 'primero' })
                    }}
                    className="px-6 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-200 transition-all duration-200"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="px-6 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-blue-500 rounded-lg hover:from-blue-700 hover:to-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/30 hover:shadow-blue-500/40"
                  >
                    {isLoading ? (
                      <div className="flex items-center">
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Guardando cambios...
                      </div>
                    ) : 'Guardar Cambios'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal Nuevo Profesor */}
        {showNewProfesorModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <h2 className="text-xl font-semibold mb-4">Añadir Nuevo Profesor</h2>
              <form onSubmit={handleCreateProfesor}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Nombre</label>
                    <input
                      type="text"
                      value={formData.nombre}
                      onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Email</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Contraseña</label>
                    <input
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Cursos a Asignar</label>
                    <div className="bg-white rounded-lg border border-gray-200">
                      <div className="max-h-64 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                        <div className="p-2 space-y-1">
                          {cursos.map((curso) => (
                            <label
                              key={curso.id}
                              className="flex items-center p-2 rounded-lg hover:bg-purple-50 transition-colors cursor-pointer group"
                            >
                              <input
                                type="checkbox"
                                id={`curso-profesor-${curso.id}`}
                                value={curso.id}
                                checked={formData.cursos_ids.includes(curso.id)}
                                onChange={(e) => {
                                  const cursoId = curso.id;
                                  setFormData(prev => ({
                                    ...prev,
                                    cursos_ids: e.target.checked
                                      ? [...prev.cursos_ids, cursoId]
                                      : prev.cursos_ids.filter(id => id !== cursoId)
                                  }));
                                }}
                                className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded transition-colors"
                              />
                              <span className="ml-3 text-sm text-gray-700 group-hover:text-purple-700 transition-colors">
                                {curso.nombre}
                              </span>
                            </label>
                          ))}
                          {cursos.length === 0 && (
                            <p className="text-sm text-gray-500 text-center py-2">
                              No hay cursos disponibles
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="p-2 border-t border-gray-100 bg-gray-50 text-xs text-gray-500 text-center">
                        {formData.cursos_ids.length} curso(s) seleccionado(s)
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => setShowNewProfesorModal(false)}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isLoading ? 'Creando profesor...' : 'Añadir Profesor'}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal de Edición */}
        {showEditModal && editingUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <h2 className="text-xl font-semibold mb-4">
                Modificar {editingUser?.role === 'profesor' ? 'Profesor' : 'Alumno'}
              </h2>
              <form onSubmit={handleEditUser}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Nombre</label>
                    <input
                      type="text"
                      value={formData.nombre}
                      onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Email</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      {editingUser?.role === 'profesor' ? 'Cursos Asignados' : 'Cursos Adquiridos'}
                    </label>
                    <div className="bg-white rounded-lg border border-gray-200">
                      <div className="max-h-64 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                        <div className="p-2 space-y-1">
                          {cursos.map((curso) => (
                            <label
                              key={curso.id}
                              className="flex items-center p-2 rounded-lg hover:bg-indigo-50 transition-colors cursor-pointer group"
                            >
                              <input
                                type="checkbox"
                                id={`curso-edit-${curso.id}`}
                                value={curso.id}
                                checked={formData.cursos_ids.includes(curso.id)}
                                onChange={(e) => {
                                  const cursoId = curso.id;
                                  setFormData(prev => ({
                                    ...prev,
                                    cursos_ids: e.target.checked
                                      ? [...prev.cursos_ids, cursoId]
                                      : prev.cursos_ids.filter(id => id !== cursoId)
                                  }));
                                }}
                                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded transition-colors"
                              />
                              <span className="ml-3 text-sm text-gray-700 group-hover:text-indigo-700 transition-colors">
                                {curso.nombre}
                              </span>
                            </label>
                          ))}
                          {cursos.length === 0 && (
                            <p className="text-sm text-gray-500 text-center py-2">
                              No hay cursos disponibles
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="p-2 border-t border-gray-100 bg-gray-50 text-xs text-gray-500 text-center">
                        {formData.cursos_ids.length} curso(s) seleccionado(s)
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => {
                        setShowEditModal(false)
                        setEditingUser(null)
                        setFormData({ ...formData, nombre: '', email: '', cursos_ids: [] })
                      }}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isLoading ? 'Guardando...' : 'Guardar Cambios'}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}