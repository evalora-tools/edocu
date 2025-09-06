export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          role: 'admin' | 'gestor' | 'profesor' | 'alumno'
          nombre: string
          email: string
          academia_id: string | null
          cursos_adquiridos: string[] | null
          cursos_asignados: string[] | null
          created_at: string
        }
        Insert: {
          id: string
          role: 'admin' | 'gestor' | 'profesor' | 'alumno'
          nombre: string
          email: string
          academia_id?: string | null
          cursos_adquiridos?: string[] | null
          cursos_asignados?: string[] | null
          created_at?: string
        }
        Update: {
          id?: string
          role?: 'admin' | 'gestor' | 'profesor' | 'alumno'
          nombre?: string
          email?: string
          academia_id?: string | null
          cursos_adquiridos?: string[] | null
          cursos_asignados?: string[] | null
          created_at?: string
        }
      }
      academias: {
        Row: {
          id: string
          nombre: string
          descripcion: string | null
          logo_url: string | null
          dominio: string | null
          configuracion: any | null
          activa: boolean
          created_at: string
        }
        Insert: {
          id?: string
          nombre: string
          descripcion?: string | null
          logo_url?: string | null
          dominio?: string | null
          configuracion?: any | null
          activa?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          nombre?: string
          descripcion?: string | null
          logo_url?: string | null
          dominio?: string | null
          configuracion?: any | null
          activa?: boolean
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
