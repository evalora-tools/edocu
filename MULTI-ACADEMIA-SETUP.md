# Configuración Multi-Academia

Este documento describe cómo configurar el sistema para soportar múltiples academias.

## 1. Migración de Base de Datos

### Paso 1: Ejecutar el script SQL
Ejecuta el archivo `database-migration.sql` en tu consola de Supabase SQL Editor:

```sql
-- El contenido completo está en database-migration.sql
```

### Paso 2: Verificar la migración
Después de ejecutar el script, verifica:

1. **Academia por defecto creada:**
```sql
SELECT * FROM academias;
```

2. **Perfiles actualizados:**
```sql
SELECT COUNT(*) FROM profiles WHERE academia_id IS NULL;
-- Debe ser 0
```

3. **Cursos actualizados:**
```sql
SELECT COUNT(*) FROM cursos WHERE academia_id IS NULL;
-- Debe ser 0
```

## 2. Funcionalidades Implementadas

### Nuevas Interfaces TypeScript
- `Academia`: Representa una academia con su configuración
- `UserProfile`: Actualizado para incluir `academia_id`
- `AuthContextType`: Incluye información de la academia

### Nuevos Componentes
- `/admin/academias`: Panel de administración de academias
- Hook `useAcademia()`: Para acceder fácilmente a la información de la academia

### Filtros por Academia
- **Cursos**: Ahora se filtran por `academia_id`
- **Contenidos**: Accesibles solo dentro de la misma academia
- **Usuarios**: Cada usuario pertenece a una academia específica

## 3. Seguridad (RLS)

### Políticas Implementadas
1. **Usuarios**: Solo pueden ver datos de su academia
2. **Administradores**: Pueden gestionar todo dentro de su academia
3. **Aislamiento**: Cada academia está completamente aislada de las demás

### Tablas Protegidas
- `academias`
- `profiles` 
- `cursos`
- `contenidos`

## 4. Uso del Sistema

### Crear Nueva Academia
1. Ve a `/admin/academias`
2. Haz clic en "Nueva Academia"
3. Rellena los datos:
   - **Nombre**: Nombre de la academia
   - **Descripción**: Descripción opcional
   - **Dominio**: Dominio opcional para identificación
   - **Activa**: Si la academia está operativa

### Asignar Usuarios a Academia
Al crear nuevos usuarios (estudiantes/profesores), asegúrate de:
1. Asignar el `academia_id` correcto
2. Verificar que el usuario admin que los crea pertenece a la misma academia

### Gestión Multi-Academia
- Cada administrador solo ve y gestiona su academia
- Los datos están completamente aislados entre academias
- Los cursos y contenidos son específicos de cada academia

## 5. Hook useAcademia()

```typescript
import { useAcademia } from '@/hooks/useAcademia'

function MiComponente() {
  const {
    academia,
    academiaId,
    isAcademiaActive,
    academiaName,
    academiaLogo,
    academiaDomain,
    academiaConfig
  } = useAcademia()

  return (
    <div>
      <h1>Bienvenido a {academiaName}</h1>
      {academiaLogo && <img src={academiaLogo} alt="Logo" />}
    </div>
  )
}
```

## 6. Consideraciones Importantes

### Migración de Datos Existentes
- Todos los datos existentes se asignan automáticamente a "Academia La Castiñeira"
- Los usuarios existentes mantienen acceso a sus cursos y contenidos

### Nuevas Academias
- Cada nueva academia debe tener al menos un administrador
- Los cursos deben crearse específicamente para cada academia
- Los usuarios no pueden acceder a datos de otras academias

### Backup y Seguridad
- Antes de ejecutar la migración, haz backup de tu base de datos
- Las políticas RLS aseguran el aislamiento completo entre academias
- Verifica que los permisos funcionan correctamente después de la migración

## 7. Próximos Pasos

### Funcionalidades Adicionales
1. **Personalización por Academia**: Temas, colores, logos
2. **Subdominios**: Acceso por subdominio específico
3. **Configuraciones Avanzadas**: Límites, características específicas
4. **Reportes por Academia**: Estadísticas independientes

### Optimizaciones
1. **Cache**: Implementar cache para información de academias
2. **CDN**: Servir assets específicos por academia
3. **Monitoreo**: Métricas independientes por academia

## 8. Solución de Problemas

### Error: "academia_id no puede ser null"
- Verifica que la migración se ejecutó completamente
- Asegúrate de que todos los usuarios tienen `academia_id` asignado

### Error: "No se pueden ver cursos"
- Verifica que las políticas RLS están activas
- Confirma que el usuario tiene `academia_id` correcto

### Error: "Acceso denegado a contenidos"
- Verifica que el curso pertenece a la misma academia que el usuario
- Confirma que las políticas RLS están configuradas correctamente
