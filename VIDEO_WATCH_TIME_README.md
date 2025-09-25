# Sistema de Contador de Tiempo de Reproductor de Video

## Descripción
Este sistema implementa un contador automático que registra el tiempo que un usuario mantiene abierto el reproductor de video, guardando esta información en la base de datos de Supabase vinculada al usuario y la clase visualizada.

## Componentes Implementados

### 1. Tabla de Base de Datos: `video_watch_time`

```sql
CREATE TABLE public.video_watch_time (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  contenido_id uuid NOT NULL,
  session_start timestamp with time zone NOT NULL DEFAULT now(),
  session_end timestamp with time zone,
  watch_time_seconds integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT video_watch_time_pkey PRIMARY KEY (id),
  CONSTRAINT video_watch_time_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT video_watch_time_contenido_id_fkey FOREIGN KEY (contenido_id) REFERENCES public.contenidos(id),
  CONSTRAINT check_watch_time_positive CHECK (watch_time_seconds >= 0)
);
```

### 2. Componente VdoCipherPlayer Modificado

**Nuevas funcionalidades:**
- Contador automático que inicia al abrir el reproductor
- Detección de cierre del reproductor (botón cerrar o eventos de navegador)  
- Llamadas automáticas a la API para registrar inicio y fin de sesión
- Manejo de eventos `beforeunload` para capturar cierres inesperados

**Nuevos props:**
- `userId?: string` - ID del usuario que visualiza el video
- `contenidoId?: string` - ID del contenido/clase que se está visualizando

### 3. Endpoints de API

#### `/api/video/start-session` (POST)
Inicia una nueva sesión de visualización:
- Valida que el usuario tenga acceso al contenido
- Finaliza cualquier sesión activa previa del mismo usuario/contenido
- Crea nueva entrada en `video_watch_time` con `is_active: true`
- Retorna `sessionId` para identificar la sesión

#### `/api/video/end-session` (POST)
Finaliza una sesión de visualización:
- Actualiza la sesión con `session_end` y `watch_time_seconds`
- Marca la sesión como `is_active: false`
- Valida que los datos sean correctos antes de guardar

### 4. Integración en la Página del Alumno

La página `src/app/alumno/asignatura/[id]/page.tsx` fue modificada para:
- Capturar el `userId` de la sesión autenticada
- Pasar `userId` y `contenidoId` al componente `VdoCipherPlayer`

## Flujo de Funcionamiento

1. **Apertura del Reproductor:**
   - Se abre el modal con el reproductor
   - Se ejecuta `startWatchSession()` automáticamente
   - Se crea una entrada en la BD con `is_active: true`
   - Se inicia el contador de tiempo en memoria

2. **Durante la Visualización:**
   - El tiempo se cuenta localmente en el componente
   - La sesión permanece activa en la base de datos

3. **Cierre del Reproductor:**
   - Se ejecuta `endWatchSession()` automáticamente
   - Se calcula el tiempo total transcurrido
   - Se actualiza la BD con el tiempo final y `is_active: false`

4. **Protecciones Implementadas:**
   - Validación de acceso del usuario al contenido
   - Finalización automática de sesiones previas activas
   - Manejo de cierres inesperados del navegador
   - Validación de datos antes del guardado

## Casos de Uso Cubiertos

- ✅ Abrir reproductor normalmente
- ✅ Cerrar reproductor con botón X
- ✅ Cerrar pestaña/ventana mientras el reproductor está abierto
- ✅ Navegación a otra página con reproductor abierto
- ✅ Múltiples sesiones del mismo usuario/contenido
- ✅ Validación de permisos de acceso al contenido
- ✅ Datos consistentes y seguros en la base de datos

## Datos Guardados

Para cada sesión se registra:
- `user_id`: Usuario que visualizó el contenido
- `contenido_id`: ID de la clase/contenido visualizado
- `session_start`: Timestamp de inicio de la visualización
- `session_end`: Timestamp de fin de la visualización  
- `watch_time_seconds`: Tiempo total en segundos que estuvo abierto el reproductor
- `is_active`: Estado de la sesión (true mientras está activa)

Estos datos permiten generar estadísticas detalladas sobre el engagement de los estudiantes con el contenido.