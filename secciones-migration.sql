-- Create the secciones table
create table public.secciones (
    id uuid not null default gen_random_uuid() primary key,
    titulo text not null,
    orden integer not null default 0,
    curso_id uuid not null references public.cursos(id) on delete cascade,
    created_at timestamp with time zone not null default now(),
    updated_at timestamp with time zone not null default now()
);

-- Add RLS policies
alter table public.secciones enable row level security;

-- Allow read access to everyone
create policy "Secciones son visibles para usuarios autenticados"
    on public.secciones
    for select
    to authenticated
    using (true);

-- Allow insert for profesores if they have access to the curso
create policy "Profesores pueden crear secciones en sus cursos"
    on public.secciones
    for insert
    to authenticated
    with check (
        exists (
            select 1 from public.profiles p
            where p.id = auth.uid()
            and p.role = 'profesor'
            and curso_id = any(p.cursos_asignados)
        )
    );

-- Allow update/delete for profesores if they have access to the curso
create policy "Profesores pueden modificar secciones en sus cursos"
    on public.secciones
    for all
    to authenticated
    using (
        exists (
            select 1 from public.profiles p
            where p.id = auth.uid()
            and p.role = 'profesor'
            and curso_id = any(p.cursos_asignados)
        )
    );

-- Add seccion_id to contenidos table
alter table public.contenidos
add column seccion_id uuid references public.secciones(id) on delete set null;
