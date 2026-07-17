-- Painel Interno AAC - Supabase schema
-- Execute este arquivo no Supabase: SQL Editor > New query > Run.

create extension if not exists "pgcrypto";

-- Perfis de usuários internos
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text not null,
  email text not null,
  perfil text not null default 'consulta' check (perfil in ('admin','presidencia','secretaria','tesouraria','bem_estar_animal','conselho_fiscal','consulta')),
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.get_perfil()
returns text
language sql
security definer
set search_path = public
as $$
  select perfil from public.profiles where id = auth.uid() and ativo = true limit 1;
$$;

create or replace function public.is_admin_or_presidencia()
returns boolean
language sql
security definer
set search_path = public
as $$
  select coalesce(public.get_perfil() in ('admin','presidencia'), false);
$$;

-- Associados
create table if not exists public.associados (
  id uuid primary key default gen_random_uuid(),
  nome_completo text not null,
  cpf text,
  endereco_residencial text,
  telefone_whatsapp text,
  tipo_cadastro text,
  possui_cavalos text,
  status text not null default 'pendente' check (status in ('pendente','aprovado','reprovado','inativo')),
  observacoes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Animais / RGA
create table if not exists public.animais (
  id uuid primary key default gen_random_uuid(),
  associado_id uuid references public.associados(id) on delete set null,
  nome_animal text not null,
  rga text unique,
  sexo text,
  idade_estimada text,
  cor_pelagem text,
  status_rga text not null default 'pendente' check (status_rga in ('pendente','ativo','suspenso','inativo')),
  observacoes_veterinarias text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Financeiro
create table if not exists public.financeiro (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('entrada','saida')),
  data_movimento date not null default current_date,
  descricao text not null,
  categoria text,
  valor numeric(12,2) not null default 0,
  forma_pagamento text,
  comprovante_url text,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Documentos por link externo, como Google Drive, OneDrive ou Supabase Storage
create table if not exists public.documentos (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  tipo text not null default 'Outro',
  data_documento date,
  url_arquivo text,
  visibilidade text not null default 'diretoria' check (visibilidade in ('diretoria','conselho_fiscal','todos')),
  descricao text,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Notícias internas / publicáveis
create table if not exists public.noticias (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  categoria text,
  data_publicacao date not null default current_date,
  resumo text not null,
  conteudo text,
  imagem_url text,
  publicada boolean not null default true,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Pareceres do Conselho Fiscal
create table if not exists public.pareceres_fiscais (
  id uuid primary key default gen_random_uuid(),
  periodo text not null,
  titulo text not null,
  parecer text not null,
  status text not null default 'em_analise' check (status in ('em_analise','aprovado','aprovado_com_ressalvas','reprovado')),
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.associados enable row level security;
alter table public.animais enable row level security;
alter table public.financeiro enable row level security;
alter table public.documentos enable row level security;
alter table public.noticias enable row level security;
alter table public.pareceres_fiscais enable row level security;

-- Policies: leitura para usuários autenticados ativos
create policy "profiles_select_own_or_admin" on public.profiles for select using (auth.uid() = id or public.is_admin_or_presidencia());
create policy "profiles_admin_manage" on public.profiles for all using (public.is_admin_or_presidencia()) with check (public.is_admin_or_presidencia());

create policy "associados_select" on public.associados for select using (public.get_perfil() is not null);
create policy "associados_insert" on public.associados for insert with check (public.get_perfil() in ('admin','presidencia','secretaria'));
create policy "associados_update" on public.associados for update using (public.get_perfil() in ('admin','presidencia','secretaria')) with check (public.get_perfil() in ('admin','presidencia','secretaria'));
create policy "associados_delete" on public.associados for delete using (public.get_perfil() in ('admin','presidencia'));

create policy "animais_select" on public.animais for select using (public.get_perfil() is not null);
create policy "animais_insert" on public.animais for insert with check (public.get_perfil() in ('admin','presidencia','secretaria','bem_estar_animal'));
create policy "animais_update" on public.animais for update using (public.get_perfil() in ('admin','presidencia','secretaria','bem_estar_animal')) with check (public.get_perfil() in ('admin','presidencia','secretaria','bem_estar_animal'));
create policy "animais_delete" on public.animais for delete using (public.get_perfil() in ('admin','presidencia'));

create policy "financeiro_select" on public.financeiro for select using (public.get_perfil() is not null);
create policy "financeiro_insert" on public.financeiro for insert with check (public.get_perfil() in ('admin','presidencia','tesouraria'));
create policy "financeiro_update" on public.financeiro for update using (public.get_perfil() in ('admin','presidencia','tesouraria')) with check (public.get_perfil() in ('admin','presidencia','tesouraria'));
create policy "financeiro_delete" on public.financeiro for delete using (public.get_perfil() in ('admin','presidencia'));

create policy "documentos_select" on public.documentos for select using (public.get_perfil() is not null);
create policy "documentos_insert" on public.documentos for insert with check (public.get_perfil() in ('admin','presidencia','secretaria','tesouraria','conselho_fiscal'));
create policy "documentos_update" on public.documentos for update using (public.get_perfil() in ('admin','presidencia','secretaria','tesouraria','conselho_fiscal')) with check (public.get_perfil() in ('admin','presidencia','secretaria','tesouraria','conselho_fiscal'));
create policy "documentos_delete" on public.documentos for delete using (public.get_perfil() in ('admin','presidencia'));

create policy "noticias_select" on public.noticias for select using (public.get_perfil() is not null);
create policy "noticias_insert" on public.noticias for insert with check (public.get_perfil() in ('admin','presidencia','secretaria'));
create policy "noticias_update" on public.noticias for update using (public.get_perfil() in ('admin','presidencia','secretaria')) with check (public.get_perfil() in ('admin','presidencia','secretaria'));
create policy "noticias_delete" on public.noticias for delete using (public.get_perfil() in ('admin','presidencia'));

create policy "pareceres_select" on public.pareceres_fiscais for select using (public.get_perfil() is not null);
create policy "pareceres_insert" on public.pareceres_fiscais for insert with check (public.get_perfil() in ('admin','presidencia','conselho_fiscal'));
create policy "pareceres_update" on public.pareceres_fiscais for update using (public.get_perfil() in ('admin','presidencia','conselho_fiscal')) with check (public.get_perfil() in ('admin','presidencia','conselho_fiscal'));
create policy "pareceres_delete" on public.pareceres_fiscais for delete using (public.get_perfil() in ('admin','presidencia'));

-- Depois de criar o primeiro usuário no Supabase Authentication,
-- rode algo assim para tornar ele administrador:
-- insert into public.profiles (id, nome, email, perfil, ativo)
-- values ('UUID_DO_USUARIO_AQUI', 'Administrador AAC', 'email@amigoscarroceiros.org.br', 'admin', true);
