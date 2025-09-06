'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { loginRateLimiter } from '@/lib/rateLimiting';
import Image from 'next/image';
import { FiLogIn, FiClock } from 'react-icons/fi';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [rateLimitInfo, setRateLimitInfo] = useState<{ blocked: boolean; message?: string }>({ blocked: false });
  const router = useRouter();
  const { signIn } = useAuth();
  const submitTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Generar clave única para rate limiting basada en email
  const getRateLimitKey = () => email || 'anonymous';

  const checkRateLimit = () => {
    const result = loginRateLimiter.canAttempt(getRateLimitKey());
    setRateLimitInfo({
      blocked: !result.allowed,
      message: result.message
    });
    return result;
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    // Limpiar error cuando el usuario empieza a escribir
    if (error) setError('');
    // Recheck rate limit con la nueva clave
    setTimeout(() => checkRateLimit(), 100);
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
    // Limpiar error cuando el usuario empieza a escribir
    if (error) setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Clear any existing timeout
    if (submitTimeoutRef.current) {
      clearTimeout(submitTimeoutRef.current);
    }
    
    const rateLimitCheck = checkRateLimit();
    if (!rateLimitCheck.allowed) {
      setError(rateLimitCheck.message || 'Rate limit exceeded');
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      await signIn(email, password);
      // Record successful attempt
      loginRateLimiter.recordAttempt(getRateLimitKey(), true);
      // El AuthContext se encarga de la redirección
    } catch (err: any) {
      console.error('Error:', err);
      
      // Record failed attempt
      loginRateLimiter.recordAttempt(getRateLimitKey(), false);
      
      let errorMessage = 'Error al iniciar sesión';
      
      if (err.message) {
        errorMessage = err.message;
      } else if (typeof err === 'string') {
        errorMessage = err;
      }
      
      // Mostrar información adicional sobre intentos restantes
      const remainingAttempts = loginRateLimiter.getRemainingAttempts(getRateLimitKey());
      if (remainingAttempts > 0 && remainingAttempts <= 2) {
        errorMessage += ` (${remainingAttempts} intento${remainingAttempts > 1 ? 's' : ''} restante${remainingAttempts > 1 ? 's' : ''})`;
      }
      
      setError(errorMessage);
      checkRateLimit(); // Update rate limit status
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-200 via-white to-blue-100 p-2 relative">
      <section className="w-full max-w-sm bg-white/95 border border-gray-100 rounded-2xl shadow-2xl px-8 py-12 flex flex-col gap-7 animate-fade-in-up transition-all duration-300">
        <div className="flex flex-col items-center gap-2 mb-2">
          <Image src="/images/favicon.ico" alt="Logo" width={60} height={60} className="rounded-full shadow-md mb-1" />
          <h1 className="text-3xl font-extrabold text-blue-800 tracking-tight drop-shadow-sm">Iniciar Sesión</h1>
        </div>
        <h2 className="text-xl font-semibold text-center text-blue-700 mb-2 tracking-tight">Bienvenido de nuevo</h2>
        <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
          <div className="flex flex-col gap-1">
            <label htmlFor="email" className="text-xs font-semibold text-gray-600">Correo electrónico</label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={handleEmailChange}
              className="rounded-lg border border-gray-300 px-3 py-2 text-base focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none transition placeholder-gray-400 bg-white shadow-sm"
              placeholder="tu@email.com"
              disabled={isLoading}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="password" className="text-xs font-semibold text-gray-600">Contraseña</label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={handlePasswordChange}
              className="rounded-lg border border-gray-300 px-3 py-2 text-base focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none transition placeholder-gray-400 bg-white shadow-sm"
              placeholder="••••••••"
              disabled={isLoading}
            />
          </div>
          {(error || rateLimitInfo.message) && (
            <div className="bg-red-100 border border-red-300 text-red-700 rounded-md px-3 py-2 text-sm text-center animate-fade-in">
              {error || rateLimitInfo.message}
            </div>
          )}
          <button
            type="submit"
            disabled={isLoading || rateLimitInfo.blocked}
            className="mt-2 w-full py-2 rounded-lg bg-gradient-to-r from-blue-700 to-blue-500 hover:from-blue-800 hover:to-blue-600 text-white font-bold text-base shadow-md flex items-center justify-center gap-2 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {rateLimitInfo.blocked ? (
              <>
                <FiClock className="text-lg" />
                Espera...
              </>
            ) : (
              <>
                <FiLogIn className="text-lg" />
                {isLoading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
              </>
            )}
          </button>
        </form>
        <div className="text-center text-sm text-gray-500 mt-2">
          ¿Olvidaste tu contraseña?{' '}
          <Link href="#" className="text-blue-600 hover:underline font-semibold">Recupérala aquí</Link>
        </div>
      </section>
      <footer className="mt-8 text-xs text-gray-400 text-center w-full">
        © {new Date().getFullYear()} Academias Platform. Todos los derechos reservados.
      </footer>
    </main>
  );
}