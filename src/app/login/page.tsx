'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import Image from 'next/image';
import { FiLogIn, FiMail, FiLock } from 'react-icons/fi';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      setError('Por favor, completa todos los campos');
      return;
    }

    setIsLoading(true);
    setError('');
    
    try {
      // Hacer login directamente con Supabase
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password
      });

      if (authError) {
        console.error('❌ Error de autenticación:', authError);
        setError(authError.message || 'Error en las credenciales');
        return;
      }

      if (!data.user) {
        setError('No se pudo obtener la información del usuario');
        return;
      }

      // Obtener perfil del usuario
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role, nombre, academia_id')
        .eq('id', data.user.id)
        .single();

      if (profileError || !profile) {
        console.error('❌ Error obteniendo perfil:', profileError);
        setError('No se pudo cargar el perfil del usuario');
        return;
      }

      // Redirigir según el rol - NO resetear isLoading aquí para mantener la pantalla de carga durante la redirección
      switch (profile.role) {
        case 'admin':
          router.push('/admin');
          return; // Salir sin resetear isLoading
        case 'gestor':
          router.push('/gestor');
          return; // Salir sin resetear isLoading
        case 'profesor':
          router.push('/profesor');
          return; // Salir sin resetear isLoading
        case 'alumno':
          router.push('/alumno');
          return; // Salir sin resetear isLoading
        default:
          router.push('/');
          return; // Salir sin resetear isLoading
      }

    } catch (err: any) {
      console.error('❌ Error inesperado:', err);
      if (err instanceof TypeError && err.message && err.message.includes('Failed to fetch')) {
        setError('Tu red está bloqueando el servicio, prueba con otra red.');
      } else {
        setError('Error inesperado. Intenta nuevamente.');
      }
      setIsLoading(false); // Solo resetear en caso de error
    }
  };

  return (
    <main className="min-h-screen flex flex-col justify-between items-center bg-gradient-to-br from-blue-300 to-blue-100">
      <div className="flex-1 flex items-center justify-center w-full">
        {/* Tarjeta principal */}
        <section className="w-full max-w-md bg-white/30 backdrop-blur-xl border border-white/40 rounded-3xl shadow-2xl px-10 py-12 flex flex-col gap-8 animate-fade-in-up transition-all duration-300">
        <div className="flex flex-col items-center gap-3 mb-2">
          <div className="bg-white/80 rounded-full p-2 shadow-lg">
            <Image src="/images/favicon.ico" alt="Logo" width={64} height={64} className="rounded-full" />
          </div>
          <h1 className="text-4xl font-extrabold text-blue-900 tracking-tight drop-shadow-md">Bienvenido</h1>
          <span className="text-base text-blue-700 font-medium tracking-tight">Accede a tu cuenta</span>
        </div>

        <form className="flex flex-col gap-6" onSubmit={handleSubmit}>
          <div className="flex flex-col gap-1">
            <label htmlFor="email" className="text-xs font-semibold text-blue-900/80 ml-1">Correo electrónico</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-400"><FiMail /></span>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) setError('');
                }}
                className="pl-10 pr-3 py-2 rounded-xl border border-blue-200 bg-white/80 text-base focus:ring-2 focus:ring-blue-300 focus:border-blue-400 outline-none transition placeholder-blue-300 shadow-sm w-full"
                placeholder="tu@email.com"
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="password" className="text-xs font-semibold text-blue-900/80 ml-1">Contraseña</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-400"><FiLock /></span>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError('');
                }}
                className="pl-10 pr-3 py-2 rounded-xl border border-blue-200 bg-white/80 text-base focus:ring-2 focus:ring-blue-300 focus:border-blue-400 outline-none transition placeholder-blue-300 shadow-sm w-full"
                placeholder="••••••••"
                disabled={isLoading}
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-100/80 border border-red-300 text-red-700 rounded-md px-3 py-2 text-sm text-center animate-fade-in">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="mt-2 w-full py-3 rounded-xl bg-gradient-to-r from-blue-700 via-blue-600 to-blue-500 hover:from-blue-800 hover:to-blue-600 text-white font-bold text-lg shadow-lg flex items-center justify-center gap-3 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FiLogIn className="text-2xl" />
            {isLoading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
          </button>
        </form>

        <div className="text-center text-sm text-blue-900/70 mt-2">
          Ante cualquier problema, contacta con tu administrador{' '}
          <Link href="#" className="text-blue-700 hover:underline font-semibold"></Link>
        </div>
      </section>

      </div>
      <footer className="mb-4 text-xs text-white/80 text-center w-full drop-shadow-lg">
        © {new Date().getFullYear()} Edocu Platform. Todos los derechos reservados.
      </footer>
    </main>
  );
}