import { useAuth } from '@/contexts/AuthContext'

export function useAcademia() {
  const { academia, profile } = useAuth()
  
  return {
    academia,
    academiaId: profile?.academia_id,
    isAcademiaActive: academia?.activa ?? false,
    academiaName: academia?.nombre,
    academiaLogo: academia?.logo_url,
    academiaDomain: academia?.dominio,
    academiaConfig: academia?.configuracion
  }
}
