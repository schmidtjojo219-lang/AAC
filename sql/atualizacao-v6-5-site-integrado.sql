-- Painel Interno AAC - Atualização V6.5
-- Integração do site público com o painel:
-- 1) Notícias publicadas no painel aparecem automaticamente no site.
-- 2) Formulários do site são gravados no Supabase e aparecem no painel.
-- Execute no Supabase: SQL Editor > New query > Run.

create extension if not exists "pgcrypto";

-- =========================================================
-- 1) Notícias: leitura pública somente das notícias publicadas
-- =========================================================
alter table public.noticias enable row level security;

drop policy if exists "noticias_select" on public.noticias;
drop policy if exists "noticias_select_publicadas" on public.noticias;

create policy "noticias_select_publicadas"
on public.noticias
for select
using (
  publicada = true
  or auth.role() = 'authenticated'
);

grant select on public.noticias to anon, authenticated;
grant insert, update, delete on public.noticias to authenticated;

-- =========================================================
-- 2) Formulários vindos do site público
-- =========================================================
create table if not exists public.site_formularios (
  id uuid primary key default gen_random_uuid(),
  origem text not null check (origem in ('associado','contato')),
  nome_completo text,
  email text,
  telefone text,
  cpf text,
  endereco_residencial text,
  tipo_cadastro text,
  possui_cavalos text,
  assunto text,
  mensagem text,
  aceite_estatuto text,
  pagina_origem text,
  dados jsonb default '{}'::jsonb,
  status text not null default 'novo' check (status in ('novo','em_analise','respondido','arquivado')),
  observacoes_internas text,
  atendido_por_nome text,
  atendido_por_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.site_formularios add column if not exists origem text;
alter table public.site_formularios add column if not exists nome_completo text;
alter table public.site_formularios add column if not exists email text;
alter table public.site_formularios add column if not exists telefone text;
alter table public.site_formularios add column if not exists cpf text;
alter table public.site_formularios add column if not exists endereco_residencial text;
alter table public.site_formularios add column if not exists tipo_cadastro text;
alter table public.site_formularios add column if not exists possui_cavalos text;
alter table public.site_formularios add column if not exists assunto text;
alter table public.site_formularios add column if not exists mensagem text;
alter table public.site_formularios add column if not exists aceite_estatuto text;
alter table public.site_formularios add column if not exists pagina_origem text;
alter table public.site_formularios add column if not exists dados jsonb default '{}'::jsonb;
alter table public.site_formularios add column if not exists status text default 'novo';
alter table public.site_formularios add column if not exists observacoes_internas text;
alter table public.site_formularios add column if not exists atendido_por_nome text;
alter table public.site_formularios add column if not exists atendido_por_email text;
alter table public.site_formularios add column if not exists updated_at timestamptz default now();

create index if not exists site_formularios_created_idx on public.site_formularios(created_at desc);
create index if not exists site_formularios_status_idx on public.site_formularios(status);
create index if not exists site_formularios_origem_idx on public.site_formularios(origem);

alter table public.site_formularios enable row level security;

drop policy if exists "site_formularios_insert_anon" on public.site_formularios;
drop policy if exists "site_formularios_select_auth" on public.site_formularios;
drop policy if exists "site_formularios_update_auth" on public.site_formularios;
drop policy if exists "site_formularios_delete_admin" on public.site_formularios;

-- O site público só pode inserir novas respostas. Não pode ler dados.
create policy "site_formularios_insert_anon"
on public.site_formularios
for insert
to anon
with check (origem in ('associado','contato'));

-- Usuários autenticados do painel podem ler e atualizar as respostas.
create policy "site_formularios_select_auth"
on public.site_formularios
for select
to authenticated
using (auth.role() = 'authenticated');

create policy "site_formularios_update_auth"
on public.site_formularios
for update
to authenticated
using (auth.role() = 'authenticated')
with check (auth.role() = 'authenticated');

create policy "site_formularios_delete_admin"
on public.site_formularios
for delete
to authenticated
using (public.get_perfil() in ('admin','presidencia'));

grant insert on public.site_formularios to anon;
grant select, update, delete on public.site_formularios to authenticated;

notify pgrst, 'reload schema';
