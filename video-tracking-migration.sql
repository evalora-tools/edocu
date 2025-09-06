-- =============================================================================
-- MIGRACIÓN PARA SEGUIMIENTO DE TIEMPO DE VISUALIZACIÓN DE VIDEOS
-- =============================================================================

-- 1. Crear tabla para seguimiento de visualización de videos
-- =============================================================================
CREATE TABLE IF NOT EXISTS video_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  contenido_id UUID REFERENCES contenidos(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL, -- ID único de la sesión de visualización
  tiempo_inicio TIMESTAMPTZ DEFAULT NOW(),
  tiempo_fin TIMESTAMPTZ,
  tiempo_visualizado INTEGER DEFAULT 0, -- En segundos
  duracion_video INTEGER, -- Duración total del video en segundos
  porcentaje_completado DECIMAL(5,2) DEFAULT 0, -- Porcentaje de completado
  ip_address INET, -- Para detectar ubicaciones diferentes
  user_agent TEXT, -- Para detectar dispositivos diferentes
  activa BOOLEAN DEFAULT true, -- Si la sesión está activa
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Crear índices para mejorar el rendimiento
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_video_sessions_user_id ON video_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_video_sessions_contenido_id ON video_sessions(contenido_id);
CREATE INDEX IF NOT EXISTS idx_video_sessions_session_id ON video_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_video_sessions_activa ON video_sessions(activa);
CREATE INDEX IF NOT EXISTS idx_video_sessions_created_at ON video_sessions(created_at);

-- 3. Crear tabla para eventos de reproducción en tiempo real
-- =============================================================================
CREATE TABLE IF NOT EXISTS video_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES video_sessions(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL, -- 'play', 'pause', 'seek', 'ended', 'close'
  timestamp_video INTEGER NOT NULL, -- Posición en el video en segundos
  timestamp_real TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}' -- Información adicional del evento
);

-- 4. Crear índices para eventos
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_video_events_session_id ON video_events(session_id);
CREATE INDEX IF NOT EXISTS idx_video_events_type ON video_events(event_type);
CREATE INDEX IF NOT EXISTS idx_video_events_timestamp ON video_events(timestamp_real);

-- 5. Habilitar RLS en las nuevas tablas
-- =============================================================================
ALTER TABLE video_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_events ENABLE ROW LEVEL SECURITY;

-- 6. Crear políticas RLS
-- =============================================================================

-- Política para video_sessions: usuarios solo pueden ver sus propias sesiones
DROP POLICY IF EXISTS "Usuarios pueden ver sus propias sesiones" ON video_sessions;
CREATE POLICY "Usuarios pueden ver sus propias sesiones" ON video_sessions
  FOR ALL USING (user_id = auth.uid());

-- Política para video_events: usuarios solo pueden ver eventos de sus sesiones
DROP POLICY IF EXISTS "Usuarios pueden ver eventos de sus sesiones" ON video_events;
CREATE POLICY "Usuarios pueden ver eventos de sus sesiones" ON video_events
  FOR ALL USING (
    session_id IN (
      SELECT id FROM video_sessions WHERE user_id = auth.uid()
    )
  );

-- Políticas para profesores: pueden ver sesiones de sus alumnos en sus cursos
DROP POLICY IF EXISTS "Profesores pueden ver sesiones de sus alumnos" ON video_sessions;
CREATE POLICY "Profesores pueden ver sesiones de sus alumnos" ON video_sessions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN contenidos c ON c.id = video_sessions.contenido_id
      WHERE p.id = auth.uid() 
      AND p.role = 'profesor'
      AND c.curso_id = ANY(p.cursos_asignados)
    )
  );

-- 7. Crear función para detectar sesiones sospechosas
-- =============================================================================
CREATE OR REPLACE FUNCTION detect_suspicious_sessions(
  p_user_id UUID,
  p_contenido_id UUID,
  p_current_ip INET DEFAULT NULL,
  p_current_user_agent TEXT DEFAULT NULL
)
RETURNS TABLE (
  is_suspicious BOOLEAN,
  reason TEXT,
  active_sessions INTEGER,
  different_ips INTEGER,
  different_devices INTEGER
) AS $$
DECLARE
  v_active_sessions INTEGER;
  v_different_ips INTEGER;
  v_different_devices INTEGER;
  v_is_suspicious BOOLEAN := FALSE;
  v_reason TEXT := '';
BEGIN
  -- Contar sesiones activas para este usuario y contenido en las últimas 2 horas
  SELECT COUNT(*)
  INTO v_active_sessions
  FROM video_sessions
  WHERE user_id = p_user_id
    AND contenido_id = p_contenido_id
    AND activa = true
    AND tiempo_inicio > NOW() - INTERVAL '2 hours';

  -- Contar IPs diferentes en las últimas 24 horas
  SELECT COUNT(DISTINCT ip_address)
  INTO v_different_ips
  FROM video_sessions
  WHERE user_id = p_user_id
    AND ip_address IS NOT NULL
    AND tiempo_inicio > NOW() - INTERVAL '24 hours';

  -- Contar dispositivos diferentes en las últimas 24 horas
  SELECT COUNT(DISTINCT user_agent)
  INTO v_different_devices
  FROM video_sessions
  WHERE user_id = p_user_id
    AND user_agent IS NOT NULL
    AND tiempo_inicio > NOW() - INTERVAL '24 hours';

  -- Evaluar si es sospechoso (umbrales más relajados)
  IF v_active_sessions > 2 THEN
    v_is_suspicious := TRUE;
    v_reason := 'Múltiples sesiones activas simultáneas';
  ELSIF v_different_ips > 5 THEN
    v_is_suspicious := TRUE;
    v_reason := 'Acceso desde múltiples ubicaciones';
  ELSIF v_different_devices > 3 THEN
    v_is_suspicious := TRUE;
    v_reason := 'Acceso desde múltiples dispositivos';
  END IF;

  RETURN QUERY SELECT 
    v_is_suspicious,
    v_reason,
    v_active_sessions,
    v_different_ips,
    v_different_devices;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Crear función para calcular tiempo efectivo de visualización
-- =============================================================================
CREATE OR REPLACE FUNCTION calculate_effective_watch_time(
  p_session_id UUID
)
RETURNS TABLE (
  tiempo_efectivo INTEGER,
  tiempo_total INTEGER,
  eficiencia DECIMAL(5,2)
) AS $$
DECLARE
  v_tiempo_efectivo INTEGER := 0;
  v_tiempo_total INTEGER := 0;
  v_eficiencia DECIMAL(5,2) := 0;
  
  event_record RECORD;
  last_play_time INTEGER := NULL;
  current_play_time INTEGER := 0;
BEGIN
  -- Obtener tiempo total de la sesión
  SELECT EXTRACT(EPOCH FROM (COALESCE(tiempo_fin, NOW()) - tiempo_inicio))::INTEGER
  INTO v_tiempo_total
  FROM video_sessions
  WHERE id = p_session_id;

  -- Calcular tiempo efectivo basado en eventos play/pause
  FOR event_record IN 
    SELECT event_type, timestamp_video, timestamp_real
    FROM video_events
    WHERE session_id = p_session_id
    ORDER BY timestamp_real
  LOOP
    CASE event_record.event_type
      WHEN 'play' THEN
        last_play_time := event_record.timestamp_video;
      WHEN 'pause', 'ended', 'close' THEN
        IF last_play_time IS NOT NULL THEN
          current_play_time := current_play_time + (event_record.timestamp_video - last_play_time);
          last_play_time := NULL;
        END IF;
    END CASE;
  END LOOP;

  v_tiempo_efectivo := current_play_time;
  
  -- Calcular eficiencia (tiempo efectivo / tiempo total)
  IF v_tiempo_total > 0 THEN
    v_eficiencia := (v_tiempo_efectivo::DECIMAL / v_tiempo_total::DECIMAL) * 100;
  END IF;

  RETURN QUERY SELECT 
    v_tiempo_efectivo,
    v_tiempo_total,
    v_eficiencia;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8.5. Crear función para limpiar sesiones antiguas
-- =============================================================================
CREATE OR REPLACE FUNCTION cleanup_old_sessions()
RETURNS INTEGER AS $$
DECLARE
  v_cleaned INTEGER;
BEGIN
  -- Cerrar sesiones activas que llevan más de 4 horas sin actividad
  UPDATE video_sessions 
  SET activa = false, 
      tiempo_fin = COALESCE(tiempo_fin, NOW())
  WHERE activa = true 
    AND tiempo_inicio < NOW() - INTERVAL '4 hours'
    AND (
      -- No tienen eventos recientes
      NOT EXISTS (
        SELECT 1 FROM video_events 
        WHERE session_id = video_sessions.id 
        AND timestamp_real > NOW() - INTERVAL '1 hour'
      )
    );
  
  GET DIAGNOSTICS v_cleaned = ROW_COUNT;
  
  RETURN v_cleaned;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Crear función para actualizar updated_at automáticamente
-- =============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_video_sessions_updated_at ON video_sessions;
CREATE TRIGGER update_video_sessions_updated_at
    BEFORE UPDATE ON video_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- INSTRUCCIONES POST-MIGRACIÓN
-- =============================================================================

/*
PASOS IMPORTANTES DESPUÉS DE EJECUTAR ESTA MIGRACIÓN:

1. Verificar que las tablas se crearon correctamente:
   SELECT table_name FROM information_schema.tables 
   WHERE table_name IN ('video_sessions', 'video_events');

2. Probar la función de detección de sesiones sospechosas:
   SELECT * FROM detect_suspicious_sessions('user-uuid', 'contenido-uuid');

3. Implementar en el frontend:
   - Hook para tracking de video
   - API endpoints para crear/actualizar sesiones
   - Componente de reproductor con seguimiento

4. Configurar alertas para administradores cuando se detecten patrones sospechosos

5. Considerar implementar rate limiting en las APIs de video
*/
