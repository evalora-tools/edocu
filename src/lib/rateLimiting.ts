// Utilidades para manejo de rate limiting y reintentos

export interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffFactor?: number;
}

export class RateLimitManager {
  private attempts: Map<string, { count: number; lastAttempt: number }> = new Map();
  
  constructor(
    private maxAttempts: number = 5,
    private cooldownMs: number = 5 * 60 * 1000, // 5 minutos
    private minTimeBetweenAttempts: number = 2000 // 2 segundos
  ) {}

  canAttempt(key: string): { allowed: boolean; waitTime?: number; message?: string } {
    const now = Date.now();
    const record = this.attempts.get(key);

    if (!record) {
      return { allowed: true };
    }

    const timeSinceLastAttempt = now - record.lastAttempt;

    // Si ha superado el número máximo de intentos
    if (record.count >= this.maxAttempts) {
      const timeUntilReset = this.cooldownMs - timeSinceLastAttempt;
      if (timeUntilReset > 0) {
        const minutesLeft = Math.ceil(timeUntilReset / 60000);
        return {
          allowed: false,
          waitTime: timeUntilReset,
          message: `Demasiados intentos fallidos. Intenta nuevamente en ${minutesLeft} minuto${minutesLeft > 1 ? 's' : ''}.`
        };
      } else {
        // Reset attempts after cooldown
        this.attempts.delete(key);
        return { allowed: true };
      }
    }

    // Si el último intento fue muy reciente
    if (timeSinceLastAttempt < this.minTimeBetweenAttempts) {
      const waitTime = this.minTimeBetweenAttempts - timeSinceLastAttempt;
      return {
        allowed: false,
        waitTime,
        message: 'Por favor, espera un momento antes de intentar nuevamente.'
      };
    }

    return { allowed: true };
  }

  recordAttempt(key: string, success: boolean = false) {
    const now = Date.now();
    
    if (success) {
      // Reset on successful attempt
      this.attempts.delete(key);
      return;
    }

    const record = this.attempts.get(key) || { count: 0, lastAttempt: 0 };
    record.count += 1;
    record.lastAttempt = now;
    this.attempts.set(key, record);
  }

  getRemainingAttempts(key: string): number {
    const record = this.attempts.get(key);
    if (!record) return this.maxAttempts;
    return Math.max(0, this.maxAttempts - record.count);
  }

  reset(key: string) {
    this.attempts.delete(key);
  }
}

export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    backoffFactor = 2
  } = options;

  let lastError: any;
  let delay = initialDelay;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      
      // No reintentar en el último intento
      if (attempt === maxRetries) {
        break;
      }

      // No reintentar si es un error que no se puede resolver con retry
      if (isNonRetryableError(error)) {
        break;
      }

      // Esperar antes del siguiente intento
      await new Promise(resolve => setTimeout(resolve, delay));
      
      // Incrementar el delay para el siguiente intento
      delay = Math.min(delay * backoffFactor, maxDelay);
    }
  }

  throw lastError;
}

function isNonRetryableError(error: any): boolean {
  if (!error?.message) return false;
  
  const message = error.message.toLowerCase();
  
  // Errores que no se deben reintentar
  const nonRetryableMessages = [
    'invalid login credentials',
    'email not confirmed',
    'user not found',
    'invalid email',
    'weak password'
  ];

  return nonRetryableMessages.some(msg => message.includes(msg));
}

// Instancia global para login
export const loginRateLimiter = new RateLimitManager(5, 5 * 60 * 1000, 2000);
