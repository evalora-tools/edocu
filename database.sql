-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.academias (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  descripcion text,
  logo_url text,
  dominio text UNIQUE,
  configuracion jsonb DEFAULT '{}'::jsonb,
  activa boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT academias_pkey PRIMARY KEY (id)
);
CREATE TABLE public.contenidos (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  tipo text NOT NULL CHECK (tipo = ANY (ARRAY['apunte'::text, 'problema'::text, 'clase'::text])),
  titulo text NOT NULL,
  descripcion text,
  archivo_url text,
  fecha date,
  duracion text,
  orden integer NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  curso_id uuid,
  estado_procesamiento text DEFAULT 'processing'::text,
  seccion_id uuid,
  CONSTRAINT contenidos_pkey PRIMARY KEY (id),
  CONSTRAINT contenidos_curso_id_fkey FOREIGN KEY (curso_id) REFERENCES public.cursos(id),
  CONSTRAINT contenidos_seccion_id_fkey FOREIGN KEY (seccion_id) REFERENCES public.secciones(id)
);
CREATE TABLE public.cursos (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  nombre text NOT NULL,
  universidad text,
  profesor_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  curso_academico text NOT NULL DEFAULT 'primero'::text,
  academia_id uuid,
  CONSTRAINT cursos_pkey PRIMARY KEY (id),
  CONSTRAINT cursos_academia_id_fkey FOREIGN KEY (academia_id) REFERENCES public.academias(id),
  CONSTRAINT cursos_profesor_id_fkey FOREIGN KEY (profesor_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.profiles (
  id uuid NOT NULL,
  role text CHECK (role = ANY (ARRAY['admin'::text, 'gestor'::text, 'profesor'::text, 'alumno'::text])),
  nombre text,
  email text,
  cursos_adquiridos ARRAY,
  cursos_asignados ARRAY,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  academia_id uuid,
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_academia_id_fkey FOREIGN KEY (academia_id) REFERENCES public.academias(id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);
CREATE TABLE public.secciones (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  titulo text NOT NULL,
  orden integer NOT NULL DEFAULT 0,
  curso_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT secciones_pkey PRIMARY KEY (id),
  CONSTRAINT secciones_curso_id_fkey FOREIGN KEY (curso_id) REFERENCES public.cursos(id)
);
CREATE TABLE public.session_events (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  event_type text,
  session_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT session_events_pkey PRIMARY KEY (id),
  CONSTRAINT session_events_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);