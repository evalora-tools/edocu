# Sistema de Seguimiento de Tiempo de Visualización de Videos

Este sistema permite controlar el tiempo efectivo de visualización de videos para prevenir el uso compartido de cuentas y garantizar que los estudiantes vean los contenidos de manera legítima.

## Características Principales

### 🎯 Control Anti-Compartición
- **Detección de múltiples sesiones**: Bloquea automáticamente cuando se detectan sesiones simultáneas
- **Seguimiento de ubicaciones**: Detecta accesos desde múltiples IPs
- **Control de dispositivos**: Monitorea accesos desde diferentes dispositivos
- **Tiempo efectivo vs tiempo total**: Calcula la eficiencia de visualización

### 📊 Seguimiento en Tiempo Real
- **Eventos de reproducción**: Play, pause, seek, ended, close
- **Actualizaciones periódicas**: Heartbeat cada 30 segundos
- **Detección de inactividad**: Pausa automática al cambiar de pestaña
- **Cierre automático**: Finaliza sesión al cerrar el reproductor

### 🔒 Seguridad y Políticas
- **Row Level Security (RLS)**: Protección a nivel de base de datos
- **Políticas por roles**: Diferentes permisos para profesores y alumnos
- **Detección de patrones sospechosos**: Algoritmos para identificar uso compartido
- **Bloqueo automático**: Suspensión temporal por actividad sospechosa

## Estructura de Base de Datos

### Tabla `video_sessions`
```sql
- id: UUID (PK)
- user_id: UUID (FK auth.users)
- contenido_id: UUID (FK contenidos)
- session_id: TEXT (Identificador único de sesión)
- tiempo_inicio: TIMESTAMPTZ
- tiempo_fin: TIMESTAMPTZ
- tiempo_visualizado: INTEGER (segundos)
- duracion_video: INTEGER (segundos)
- porcentaje_completado: DECIMAL(5,2)
- ip_address: INET
- user_agent: TEXT
- activa: BOOLEAN
```

### Tabla `video_events`
```sql
- id: UUID (PK)
- session_id: UUID (FK video_sessions)
- event_type: TEXT ('play', 'pause', 'seek', 'ended', 'close')
- timestamp_video: INTEGER (posición en el video)
- timestamp_real: TIMESTAMPTZ
- metadata: JSONB (información adicional)
```

## API Endpoints

### 1. Iniciar Sesión de Tracking
```
POST /api/video/start-session
{
  "contenido_id": "uuid",
  "duracion_video": 3600,
  "ip_address": "192.168.1.1",
  "user_agent": "Mozilla/5.0..."
}
```

### 2. Registrar Evento de Video
```
POST /api/video/track-event
{
  "session_id": "uuid",
  "event_type": "play",
  "timestamp_video": 120,
  "metadata": {}
}
```

### 3. Actualizar Tiempo de Visualización
```
POST /api/video/update-time
{
  "session_id": "uuid",
  "tiempo_visualizado": 180
}
```

### 4. Analíticas para Profesores
```
GET /api/video/analytics?curso_id=uuid&contenido_id=uuid
```

## Componentes React

### 1. Hook `useVideoTracking`
Hook personalizado que maneja todo el tracking automáticamente:

```tsx
const {
  session,
  isTracking,
  error,
  attachToVideo,
  endSession,
  trackEvent
} = useVideoTracking({
  contenidoId: 'uuid',
  duracionVideo: 3600,
  onSuspiciousActivity: (reason) => {
    // Manejar actividad sospechosa
  },
  onWarning: (message) => {
    // Mostrar advertencia
  }
})
```

### 2. Componente `VdoCipherPlayer`
Reproductor especializado para VdoCipher con tracking integrado:

```tsx
<VdoCipherPlayer
  otp={otp}
  playbackInfo={playbackInfo}
  contenidoId={contenido.id}
  titulo={contenido.titulo}
  duracion={duracion}
  onClose={handleClose}
  onSuspiciousActivity={handleSuspicious}
/>
```

### 3. Componente `TrackedVideoPlayer`
Reproductor genérico para archivos MP4 con tracking:

```tsx
<TrackedVideoPlayer
  src={videoUrl}
  contenidoId={contenido.id}
  duracion={duracion}
  onSuspiciousActivity={handleSuspicious}
/>
```

## Funciones de Base de Datos

### 1. Detección de Sesiones Sospechosas
```sql
SELECT * FROM detect_suspicious_sessions(
  'user-uuid', 
  'contenido-uuid',
  '192.168.1.1'::INET,
  'Mozilla/5.0...'
);
```

### 2. Cálculo de Tiempo Efectivo
```sql
SELECT * FROM calculate_effective_watch_time('session-uuid');
```

## Configuración de Seguridad

### Umbrales de Detección
- **Sesiones simultáneas**: Máximo 1 por contenido
- **IPs diferentes**: Máximo 3 en 24 horas
- **Dispositivos diferentes**: Máximo 2 en 24 horas
- **Eficiencia mínima**: 60% (tiempo efectivo/tiempo total)

### Políticas de Bloqueo
- **Bloqueo temporal**: 30 minutos por primera infracción
- **Bloqueo escalado**: Incrementa con infracciones repetidas
- **Notificación a profesores**: Alertas automáticas por actividad sospechosa

## Instalación y Configuración

### 1. Ejecutar Migración de Base de Datos
```bash
# Ejecutar el archivo video-tracking-migration.sql en tu base de datos Supabase
```

### 2. Configurar Variables de Entorno
```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Instalar Dependencias
```bash
npm install
```

### 4. Implementar en Páginas de Video
```tsx
// En tu página de contenido
import VdoCipherPlayer from '@/components/video/VdoCipherPlayer'

// Usar el componente con tracking
<VdoCipherPlayer
  otp={otp}
  playbackInfo={playbackInfo}
  contenidoId={contenido.id}
  // ... otros props
/>
```

## Monitoreo y Analíticas

### Para Profesores
- **Dashboard de sesiones**: Ver actividad de estudiantes en tiempo real
- **Estadísticas de completado**: Porcentajes de finalización por video
- **Detección de anomalías**: Alertas de patrones sospechosos
- **Reportes de progreso**: Análisis detallado del progreso estudiantil

### Para Administradores
- **Métricas globales**: Estadísticas a nivel de academia
- **Detección de fraude**: Patrones de uso compartido
- **Optimización de contenido**: Videos con baja retención
- **Uso de recursos**: Consumo de ancho de banda

## Consideraciones Técnicas

### Rendimiento
- **Índices optimizados**: Para consultas rápidas de sesiones
- **Limpieza automática**: Eliminación de sesiones antiguas
- **Rate limiting**: Prevención de spam en APIs
- **Caching**: Resultados de analíticas cacheados

### Privacidad
- **Datos mínimos**: Solo se recopila información necesaria
- **Anonimización**: IPs hasheadas después de 24h
- **GDPR compliant**: Respeta regulaciones de privacidad
- **Consentimiento**: Notificación clara del seguimiento

### Escalabilidad
- **Particionamiento**: Tablas particionadas por fecha
- **Archivado**: Datos antiguos movidos a storage frío
- **CDN integration**: Videos servidos desde CDN
- **Load balancing**: Distribución de carga para APIs

## Troubleshooting

### Problemas Comunes

1. **"Sesión no iniciada"**
   - Verificar permisos de usuario
   - Comprobar conectividad con Supabase
   - Revisar políticas RLS

2. **"Actividad sospechosa detectada"**
   - Verificar si el usuario está usando VPN
   - Revisar cambios recientes de ubicación
   - Validar que no haya sesiones duplicadas

3. **"Error de tracking"**
   - Verificar que el contenido existe
   - Comprobar que el usuario tiene acceso
   - Revisar logs de la consola

### Logs y Debugging
```javascript
// Habilitar logs detallados
localStorage.setItem('video-tracking-debug', 'true')

// Ver estado de sesión actual
console.log(videoTrackingState)
```

## Roadmap

### Próximas Características
- [ ] **Machine Learning**: Detección más inteligente de patrones
- [ ] **Integración con LMS**: Conexión con sistemas de gestión de aprendizaje
- [ ] **Reportes automáticos**: Generación de informes periódicos
- [ ] **API móvil**: Soporte para aplicaciones móviles nativas
- [ ] **Blockchain**: Certificados inmutables de completado

### Mejoras Planificadas
- [ ] **Performance**: Optimización de consultas de base de datos
- [ ] **UX**: Mejor feedback visual para estudiantes
- [ ] **Security**: Autenticación de dos factores para videos premium
- [ ] **Analytics**: Dashboard más avanzado para profesores
- [ ] **Integration**: Webhooks para sistemas externos
