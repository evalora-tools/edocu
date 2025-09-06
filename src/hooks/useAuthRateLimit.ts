import { useState, useCallback } from 'react';
import { loginRateLimiter } from '@/lib/rateLimiting';

interface UseAuthRateLimitReturn {
  isBlocked: boolean;
  message: string | null;
  remainingAttempts: number;
  canAttempt: (email: string) => boolean;
  recordAttempt: (email: string, success: boolean) => void;
  reset: (email: string) => void;
  getBlockedTime: (email: string) => number;
}

export function useAuthRateLimit(): UseAuthRateLimitReturn {
  const [message, setMessage] = useState<string | null>(null);
  const [isBlocked, setIsBlocked] = useState(false);

  const canAttempt = useCallback((email: string): boolean => {
    const key = email || 'anonymous';
    const result = loginRateLimiter.canAttempt(key);
    
    setIsBlocked(!result.allowed);
    setMessage(result.message || null);
    
    return result.allowed;
  }, []);

  const recordAttempt = useCallback((email: string, success: boolean) => {
    const key = email || 'anonymous';
    loginRateLimiter.recordAttempt(key, success);
    
    if (success) {
      setIsBlocked(false);
      setMessage(null);
    } else {
      // Recheck status after failed attempt
      canAttempt(email);
    }
  }, [canAttempt]);

  const reset = useCallback((email: string) => {
    const key = email || 'anonymous';
    loginRateLimiter.reset(key);
    setIsBlocked(false);
    setMessage(null);
  }, []);

  const remainingAttempts = useCallback((email: string): number => {
    const key = email || 'anonymous';
    return loginRateLimiter.getRemainingAttempts(key);
  }, []);

  const getBlockedTime = useCallback((email: string): number => {
    const key = email || 'anonymous';
    const result = loginRateLimiter.canAttempt(key);
    return result.waitTime || 0;
  }, []);

  return {
    isBlocked,
    message,
    remainingAttempts: remainingAttempts(''),
    canAttempt,
    recordAttempt,
    reset,
    getBlockedTime
  };
}
