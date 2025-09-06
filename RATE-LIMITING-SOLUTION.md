# Solución para Rate Limiting en Inicio de Sesión

## Problema
El formulario de inicio de sesión mostraba errores de "Request rate limit reached" cuando los usuarios intentaban hacer login múltiples veces rápidamente.

## Solución Implementada

### 1. Rate Limiting en el Cliente (`src/lib/rateLimiting.ts`)
- **Clase RateLimitManager**: Maneja límites de intentos por usuario
- **Configuración**:
  - Máximo 5 intentos por email
  - Cooldown de 5 minutos después de superar el límite
  - Mínimo 2 segundos entre intentos
- **Funciones de utilidad**: Retry con backoff exponencial

### 2. Manejo de Errores Mejorado (`src/lib/supabase.ts`)
- **Función handleSupabaseError**: Traduce errores técnicos a mensajes amigables
- **Detección de errores específicos**:
  - Rate limiting
  - Credenciales incorrectas
  - Email no confirmado
  - Errores de red
  - Timeouts

### 3. Contexto de Autenticación Optimizado (`src/contexts/AuthContext.tsx`)
- **Cierre de sesión inteligente**: Solo cierra sesión si hay una activa
- **Pausa estratégica**: 500ms después del signOut para evitar rate limiting
- **Manejo de errores consistente**: Usa la función centralizada de manejo de errores

### 4. Formulario de Login Mejorado (`src/app/login/page.tsx`)
- **Rate limiting visual**: 
  - Botón deshabilitado cuando está bloqueado
  - Mensajes informativos sobre intentos restantes
  - Indicador visual de tiempo de espera
- **Experiencia del usuario**:
  - Limpia errores al escribir
  - Muestra tiempo restante para reintentar
  - Feedback inmediato sobre el estado

### 5. Hook Personalizado (`src/hooks/useAuthRateLimit.ts`)
- **Interfaz simplificada** para manejar rate limiting
- **Estado centralizado** para componentes que necesiten esta funcionalidad
- **Funciones utilitarias** para reset, verificación y conteo

## Características

### Rate Limiting Inteligente
- ✅ **Por usuario**: Cada email tiene su propio contador
- ✅ **Progresivo**: Muestra intentos restantes
- ✅ **Auto-reset**: Se reinicia después del tiempo de cooldown
- ✅ **Prevención de spam**: Mínimo tiempo entre intentos

### Manejo de Errores
- ✅ **Mensajes claros**: Traducción de errores técnicos
- ✅ **Detección específica**: Diferentes tipos de errores
- ✅ **Feedback visual**: Estados claros en la UI
- ✅ **Logging centralizado**: Para debugging y monitoreo

### Experiencia del Usuario
- ✅ **Feedback inmediato**: El usuario sabe exactamente qué está pasando
- ✅ **Prevención de errores**: Validación antes del envío
- ✅ **Recuperación automática**: Reset después del tiempo de espera
- ✅ **Accesibilidad**: Estados claros para lectores de pantalla

## Uso

### Para desarrolladores
```typescript
import { loginRateLimiter } from '@/lib/rateLimiting';

// Verificar si puede intentar
const result = loginRateLimiter.canAttempt(email);
if (!result.allowed) {
  console.log(result.message);
  return;
}

// Registrar intento
loginRateLimiter.recordAttempt(email, success);
```

### Para usuarios
1. **Funciona automáticamente**: No requiere acción del usuario
2. **Mensajes claros**: Indica cuándo puede reintentar
3. **Visual feedback**: El botón se deshabilita cuando está bloqueado
4. **Auto-recuperación**: Se reinicia automáticamente después del tiempo de espera

## Configuración

Las siguientes constantes pueden ajustarse en `src/lib/rateLimiting.ts`:

```typescript
const MAX_ATTEMPTS = 5; // Número máximo de intentos
const COOLDOWN_TIME = 5 * 60 * 1000; // 5 minutos en millisegundos
const MIN_TIME_BETWEEN_ATTEMPTS = 2000; // 2 segundos entre intentos
```

## Beneficios

1. **Reduce errores de rate limiting** del servidor
2. **Mejora la experiencia del usuario** con feedback claro
3. **Previene ataques de fuerza bruta** básicos
4. **Optimiza las requests** al servidor de autenticación
5. **Facilita debugging** con logs centralizados
