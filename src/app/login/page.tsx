'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import Image from 'next/image';
import { FiLogIn } from 'react-icons/fi';

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
      console.log('🔐 Intentando login para:', email);
      
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

      console.log('✅ Login exitoso para:', data.user.email);

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

      console.log('✅ Perfil cargado:', profile);

      // Redirigir según el rol
      switch (profile.role) {
        case 'admin':
          router.push('/admin');
          break;
        case 'gestor':
          router.push('/gestor');
          break;
        case 'profesor':
          router.push('/profesor');
          break;
        case 'alumno':
          router.push('/alumno');
          break;
        default:
          router.push('/');
      }

    } catch (err: any) {
      console.error('❌ Error inesperado:', err);
      setError('Error inesperado. Intenta nuevamente.');
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
              onChange={(e) => {
                setEmail(e.target.value);
                if (error) setError('');
              }}
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
              onChange={(e) => {
                setPassword(e.target.value);
                if (error) setError('');
              }}
              className="rounded-lg border border-gray-300 px-3 py-2 text-base focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none transition placeholder-gray-400 bg-white shadow-sm"
              placeholder="••••••••"
              disabled={isLoading}
            />
          </div>
          
          {error && (
            <div className="bg-red-100 border border-red-300 text-red-700 rounded-md px-3 py-2 text-sm text-center animate-fade-in">
              {error}
            </div>
          )}
          
          <button
            type="submit"
            disabled={isLoading}
            className="mt-2 w-full py-2 rounded-lg bg-gradient-to-r from-blue-700 to-blue-500 hover:from-blue-800 hover:to-blue-600 text-white font-bold text-base shadow-md flex items-center justify-center gap-2 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FiLogIn className="text-lg" />
            {isLoading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
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