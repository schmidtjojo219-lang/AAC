-- Painel Interno AAC - Atualização V6.3 + V6.4
-- Inclui correções completas de Atas/Documentos/Protocolos, backup/exportação e validação pública de documentos.
-- Execute no Supabase: SQL Editor > New query > Run.

create extension if not exists "pgcrypto";

-- =========================================================
-- 1) DOCUMENTOS ANTIGOS: garante campos para arquivo interno e metadados
-- =========================================================
create table if not exists public.documentos (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  tipo text default 'Documento',
  data_documento date default current_date,
  url_arquivo text,
  arquivo_path text,
  visibilidade text default 'diretoria',
  descricao text,
  cadastrado_por_nome text,
  cadastrado_por_email text,
  atualizado_por_nome text,
  atualizado_por_email text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.documentos add column if not exists arquivo_path text;
alter table public.documentos add column if not exists visibilidade text default 'diretoria';
alter table public.documentos add column if not exists cadastrado_por_nome text;
alter table public.documentos add column if not exists cadastrado_por_email text;
alter table public.documentos add column if not exists atualizado_por_nome text;
alter table public.documentos add column if not exists atualizado_por_email text;
alter table public.documentos add column if not exists updated_at timestamptz default now();

-- =========================================================
-- 2) ATAS
-- =========================================================
create table if not exists public.atas (
  id uuid primary key default gen_random_uuid(),
  tipo text default 'Ata de Reunião da Diretoria Executiva',
  titulo text not null,
  data_reuniao date default current_date,
  horario text,
  local text default 'Sede da AAC',
  presidencia text,
  secretaria text,
  pauta text,
  deliberacoes text,
  presentes text,
  observacoes text,
  status text default 'rascunho',
  cadastrado_por_nome text,
  cadastrado_por_email text,
  atualizado_por_nome text,
  atualizado_por_email text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.atas add column if not exists tipo text default 'Ata de Reunião da Diretoria Executiva';
alter table public.atas add column if not exists titulo text;
alter table public.atas add column if not exists data_reuniao date default current_date;
alter table public.atas add column if not exists horario text;
alter table public.atas add column if not exists local text default 'Sede da AAC';
alter table public.atas add column if not exists presidencia text;
alter table public.atas add column if not exists secretaria text;
alter table public.atas add column if not exists pauta text;
alter table public.atas add column if not exists deliberacoes text;
alter table public.atas add column if not exists presentes text;
alter table public.atas add column if not exists observacoes text;
alter table public.atas add column if not exists status text default 'rascunho';
alter table public.atas add column if not exists cadastrado_por_nome text;
alter table public.atas add column if not exists cadastrado_por_email text;
alter table public.atas add column if not exists atualizado_por_nome text;
alter table public.atas add column if not exists atualizado_por_email text;
alter table public.atas add column if not exists updated_at timestamptz default now();

-- =========================================================
-- 3) PROTOCOLOS
-- =========================================================
create table if not exists public.protocolos (
  id uuid primary key default gen_random_uuid(),
  numero_protocolo text,
  orgao text not null,
  assunto text not null,
  data_envio date default current_date,
  prazo_resposta date,
  responsavel text,
  status text default 'em_andamento',
  observacoes text,
  arquivo_path text,
  cadastrado_por_nome text,
  cadastrado_por_email text,
  atualizado_por_nome text,
  atualizado_por_email text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.protocolos add column if not exists numero_protocolo text;
alter table public.protocolos add column if not exists orgao text;
alter table public.protocolos add column if not exists assunto text;
alter table public.protocolos add column if not exists data_envio date default current_date;
alter table public.protocolos add column if not exists prazo_resposta date;
alter table public.protocolos add column if not exists responsavel text;
alter table public.protocolos add column if not exists status text default 'em_andamento';
alter table public.protocolos add column if not exists observacoes text;
alter table public.protocolos add column if not exists arquivo_path text;
alter table public.protocolos add column if not exists cadastrado_por_nome text;
alter table public.protocolos add column if not exists cadastrado_por_email text;
alter table public.protocolos add column if not exists atualizado_por_nome text;
alter table public.protocolos add column if not exists atualizado_por_email text;
alter table public.protocolos add column if not exists updated_at timestamptz default now();

-- =========================================================
-- 4) BIBLIOTECA DOCUMENTAL
-- =========================================================
create table if not exists public.biblioteca_documentos (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  categoria text default 'Institucional',
  tipo text default 'PDF',
  data_documento date default current_date,
  visibilidade text default 'diretoria',
  descricao text,
  arquivo_path text,
  url_arquivo text,
  cadastrado_por_nome text,
  cadastrado_por_email text,
  atualizado_por_nome text,
  atualizado_por_email text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.biblioteca_documentos add column if not exists titulo text;
alter table public.biblioteca_documentos add column if not exists categoria text default 'Institucional';
alter table public.biblioteca_documentos add column if not exists tipo text default 'PDF';
alter table public.biblioteca_documentos add column if not exists data_documento date default current_date;
alter table public.biblioteca_documentos add column if not exists visibilidade text default 'diretoria';
alter table public.biblioteca_documentos add column if not exists descricao text;
alter table public.biblioteca_documentos add column if not exists arquivo_path text;
alter table public.biblioteca_documentos add column if not exists url_arquivo text;
alter table public.biblioteca_documentos add column if not exists cadastrado_por_nome text;
alter table public.biblioteca_documentos add column if not exists cadastrado_por_email text;
alter table public.biblioteca_documentos add column if not exists atualizado_por_nome text;
alter table public.biblioteca_documentos add column if not exists atualizado_por_email text;
alter table public.biblioteca_documentos add column if not exists updated_at timestamptz default now();

-- =========================================================
-- 5) VALIDAÇÃO PÚBLICA DE DOCUMENTOS
-- =========================================================
create table if not exists public.documentos_validacoes (
  id uuid primary key default gen_random_uuid(),
  codigo_validacao text unique not null,
  tipo_documento text not null,
  titulo text not null,
  codigo_referencia text,
  associado_id uuid,
  animal_id uuid,
  ata_id uuid,
  mensalidade_id uuid,
  emitido_por_nome text,
  emitido_por_email text,
  emitido_em timestamptz default now(),
  dados_publicos jsonb default '{}'::jsonb,
  status text default 'valido',
  created_at timestamptz default now()
);

alter table public.documentos_validacoes add column if not exists codigo_validacao text;
alter table public.documentos_validacoes add column if not exists tipo_documento text;
alter table public.documentos_validacoes add column if not exists titulo text;
alter table public.documentos_validacoes add column if not exists codigo_referencia text;
alter table public.documentos_validacoes add column if not exists associado_id uuid;
alter table public.documentos_validacoes add column if not exists animal_id uuid;
alter table public.documentos_validacoes add column if not exists ata_id uuid;
alter table public.documentos_validacoes add column if not exists mensalidade_id uuid;
alter table public.documentos_validacoes add column if not exists emitido_por_nome text;
alter table public.documentos_validacoes add column if not exists emitido_por_email text;
alter table public.documentos_validacoes add column if not exists emitido_em timestamptz default now();
alter table public.documentos_validacoes add column if not exists dados_publicos jsonb default '{}'::jsonb;
alter table public.documentos_validacoes add column if not exists status text default 'valido';

create unique index if not exists documentos_validacoes_codigo_idx on public.documentos_validacoes(codigo_validacao);
create index if not exists documentos_validacoes_emitido_idx on public.documentos_validacoes(emitido_em desc);

-- Recria view pública sem expor e-mail do emissor nem IDs internos sensíveis.
drop view if exists public.consulta_publica_documentos;
create view public.consulta_publica_documentos as
select
  codigo_validacao,
  tipo_documento,
  titulo,
  codigo_referencia,
  emitido_por_nome,
  emitido_em,
  dados_publicos,
  status
from public.documentos_validacoes
where status = 'valido';

-- =========================================================
-- 6) STORAGE: buckets e policies
-- =========================================================
insert into storage.buckets (id, name, public)
values ('aac-arquivos', 'aac-arquivos', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('aac-publico', 'aac-publico', true)
on conflict (id) do nothing;

drop policy if exists "aac_arquivos_select_auth" on storage.objects;
drop policy if exists "aac_arquivos_insert_auth" on storage.objects;
drop policy if exists "aac_arquivos_update_auth" on storage.objects;
drop policy if exists "aac_arquivos_delete_admin" on storage.objects;
drop policy if exists "aac_publico_select_public" on storage.objects;
drop policy if exists "aac_publico_insert_auth" on storage.objects;
drop policy if exists "aac_publico_update_auth" on storage.objects;
drop policy if exists "aac_publico_delete_admin" on storage.objects;

create policy "aac_arquivos_select_auth" on storage.objects
for select using (bucket_id = 'aac-arquivos' and auth.role() = 'authenticated');

create policy "aac_arquivos_insert_auth" on storage.objects
for insert with check (bucket_id = 'aac-arquivos' and auth.role() = 'authenticated');

create policy "aac_arquivos_update_auth" on storage.objects
for update using (bucket_id = 'aac-arquivos' and auth.role() = 'authenticated')
with check (bucket_id = 'aac-arquivos' and auth.role() = 'authenticated');

create policy "aac_arquivos_delete_admin" on storage.objects
for delete using (bucket_id = 'aac-arquivos' and public.get_perfil() in ('admin','presidencia'));

create policy "aac_publico_select_public" on storage.objects
for select using (bucket_id = 'aac-publico');

create policy "aac_publico_insert_auth" on storage.objects
for insert with check (bucket_id = 'aac-publico' and auth.role() = 'authenticated');

create policy "aac_publico_update_auth" on storage.objects
for update using (bucket_id = 'aac-publico' and auth.role() = 'authenticated')
with check (bucket_id = 'aac-publico' and auth.role() = 'authenticated');

create policy "aac_publico_delete_admin" on storage.objects
for delete using (bucket_id = 'aac-publico' and public.get_perfil() in ('admin','presidencia'));

-- =========================================================
-- 7) RLS e policies das tabelas
-- =========================================================
alter table public.documentos enable row level security;
alter table public.atas enable row level security;
alter table public.protocolos enable row level security;
alter table public.biblioteca_documentos enable row level security;
alter table public.documentos_validacoes enable row level security;

drop policy if exists "documentos_select" on public.documentos;
drop policy if exists "documentos_insert" on public.documentos;
drop policy if exists "documentos_update" on public.documentos;
drop policy if exists "documentos_delete" on public.documentos;
create policy "documentos_select" on public.documentos for select using (auth.role() = 'authenticated');
create policy "documentos_insert" on public.documentos for insert with check (auth.role() = 'authenticated');
create policy "documentos_update" on public.documentos for update using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "documentos_delete" on public.documentos for delete using (public.get_perfil() in ('admin','presidencia'));

drop policy if exists "atas_select" on public.atas;
drop policy if exists "atas_insert" on public.atas;
drop policy if exists "atas_update" on public.atas;
drop policy if exists "atas_delete" on public.atas;
create policy "atas_select" on public.atas for select using (auth.role() = 'authenticated');
create policy "atas_insert" on public.atas for insert with check (auth.role() = 'authenticated');
create policy "atas_update" on public.atas for update using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "atas_delete" on public.atas for delete using (public.get_perfil() in ('admin','presidencia','secretaria'));

drop policy if exists "protocolos_select" on public.protocolos;
drop policy if exists "protocolos_insert" on public.protocolos;
drop policy if exists "protocolos_update" on public.protocolos;
drop policy if exists "protocolos_delete" on public.protocolos;
create policy "protocolos_select" on public.protocolos for select using (auth.role() = 'authenticated');
create policy "protocolos_insert" on public.protocolos for insert with check (auth.role() = 'authenticated');
create policy "protocolos_update" on public.protocolos for update using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "protocolos_delete" on public.protocolos for delete using (public.get_perfil() in ('admin','presidencia','secretaria'));

drop policy if exists "biblioteca_documentos_select" on public.biblioteca_documentos;
drop policy if exists "biblioteca_documentos_insert" on public.biblioteca_documentos;
drop policy if exists "biblioteca_documentos_update" on public.biblioteca_documentos;
drop policy if exists "biblioteca_documentos_delete" on public.biblioteca_documentos;
create policy "biblioteca_documentos_select" on public.biblioteca_documentos for select using (auth.role() = 'authenticated');
create policy "biblioteca_documentos_insert" on public.biblioteca_documentos for insert with check (auth.role() = 'authenticated');
create policy "biblioteca_documentos_update" on public.biblioteca_documentos for update using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "biblioteca_documentos_delete" on public.biblioteca_documentos for delete using (public.get_perfil() in ('admin','presidencia','secretaria'));

drop policy if exists "documentos_validacoes_select_auth" on public.documentos_validacoes;
drop policy if exists "documentos_validacoes_insert_auth" on public.documentos_validacoes;
drop policy if exists "documentos_validacoes_update_auth" on public.documentos_validacoes;
drop policy if exists "consulta_publica_documentos_select" on public.documentos_validacoes;
create policy "documentos_validacoes_select_auth" on public.documentos_validacoes for select using (auth.role() = 'authenticated');
create policy "documentos_validacoes_insert_auth" on public.documentos_validacoes for insert with check (auth.role() = 'authenticated');
create policy "documentos_validacoes_update_auth" on public.documentos_validacoes for update using (public.get_perfil() in ('admin','presidencia','secretaria')) with check (public.get_perfil() in ('admin','presidencia','secretaria'));

-- A view pública usa grant de select para anon/authenticated.
grant select on public.consulta_publica_documentos to anon, authenticated;
grant select, insert, update, delete on public.documentos to authenticated;
grant select, insert, update, delete on public.atas to authenticated;
grant select, insert, update, delete on public.protocolos to authenticated;
grant select, insert, update, delete on public.biblioteca_documentos to authenticated;
grant select, insert, update on public.documentos_validacoes to authenticated;
grant select on public.documentos_validacoes to authenticated;

create index if not exists atas_data_idx on public.atas(data_reuniao desc);
create index if not exists protocolos_data_idx on public.protocolos(data_envio desc);
create index if not exists protocolos_status_idx on public.protocolos(status);
create index if not exists biblioteca_documentos_data_idx on public.biblioteca_documentos(data_documento desc);

notify pgrst, 'reload schema';
