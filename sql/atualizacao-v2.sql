-- Painel Interno AAC - Atualização V2
-- Execute uma vez no Supabase: SQL Editor > New query > Run.
-- Esta atualização mantém seus dados existentes e adiciona ficha de associado, anexos, RGA completo, mensalidades, relatórios e storage.

create extension if not exists "pgcrypto";

-- 1) Associados: novos campos cadastrais e anexos
alter table public.associados add column if not exists matricula text;
alter table public.associados add column if not exists numero_ficha text;
alter table public.associados add column if not exists data_admissao date;
alter table public.associados add column if not exists data_nascimento date;
alter table public.associados add column if not exists estado_civil text;
alter table public.associados add column if not exists nacionalidade text;
alter table public.associados add column if not exists profissao text;
alter table public.associados add column if not exists rg text;
alter table public.associados add column if not exists orgao_emissor_uf text;
alter table public.associados add column if not exists email text;
alter table public.associados add column if not exists rua_logradouro text;
alter table public.associados add column if not exists numero text;
alter table public.associados add column if not exists complemento text;
alter table public.associados add column if not exists bairro text;
alter table public.associados add column if not exists cidade text default 'São Francisco do Sul';
alter table public.associados add column if not exists uf text default 'SC';
alter table public.associados add column if not exists cep text;
alter table public.associados add column if not exists atividade_proprietario boolean not null default false;
alter table public.associados add column if not exists atividade_frete boolean not null default false;
alter table public.associados add column if not exists atividade_apoiador boolean not null default false;
alter table public.associados add column if not exists aceite_normas boolean not null default false;
alter table public.associados add column if not exists ficha_pdf_path text;
alter table public.associados add column if not exists ficha_pdf_url text;
create unique index if not exists associados_matricula_unique on public.associados(matricula) where matricula is not null and matricula <> '';
create unique index if not exists associados_numero_ficha_unique on public.associados(numero_ficha) where numero_ficha is not null and numero_ficha <> '';

-- 2) Animais/RGA: campos sanitários e anexo de ficha
alter table public.animais add column if not exists especie text default 'Equino';
alter table public.animais add column if not exists marcas_especificas text;
alter table public.animais add column if not exists exame_aie_status text check (exame_aie_status is null or exame_aie_status in ('negativo','positivo'));
alter table public.animais add column if not exists exame_mormo_status text check (exame_mormo_status is null or exame_mormo_status in ('negativo','positivo'));
alter table public.animais add column if not exists vacinas_status text check (vacinas_status is null or vacinas_status in ('em_dia','pendente'));
alter table public.animais add column if not exists estado_fisico_status text check (estado_fisico_status is null or estado_fisico_status in ('apto','inapto'));
alter table public.animais add column if not exists cascos_status text check (cascos_status is null or cascos_status in ('bom','ruim'));
alter table public.animais add column if not exists data_vistoria date;
alter table public.animais add column if not exists visto_veterinario text;
alter table public.animais add column if not exists ficha_rga_pdf_path text;
alter table public.animais add column if not exists ficha_rga_pdf_url text;

-- 3) Mensalidades
create table if not exists public.mensalidades (
  id uuid primary key default gen_random_uuid(),
  associado_id uuid references public.associados(id) on delete cascade,
  competencia text not null,
  data_vencimento date not null,
  valor numeric(12,2) not null default 25,
  juros numeric(12,2) not null default 0,
  valor_pago numeric(12,2),
  data_pagamento date,
  forma_pagamento text,
  status text not null default 'aberto' check (status in ('aberto','pago','atrasado','isento','cancelado')),
  observacoes text,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (associado_id, competencia)
);

alter table public.mensalidades enable row level security;

drop policy if exists "mensalidades_select" on public.mensalidades;
drop policy if exists "mensalidades_insert" on public.mensalidades;
drop policy if exists "mensalidades_update" on public.mensalidades;
drop policy if exists "mensalidades_delete" on public.mensalidades;
create policy "mensalidades_select" on public.mensalidades for select using (public.get_perfil() is not null);
create policy "mensalidades_insert" on public.mensalidades for insert with check (public.get_perfil() in ('admin','presidencia','tesouraria'));
create policy "mensalidades_update" on public.mensalidades for update using (public.get_perfil() in ('admin','presidencia','tesouraria')) with check (public.get_perfil() in ('admin','presidencia','tesouraria'));
create policy "mensalidades_delete" on public.mensalidades for delete using (public.get_perfil() in ('admin','presidencia'));

-- 4) Notícias: permitir leitura pública apenas das publicadas, para futura integração com o site público
alter table public.noticias enable row level security;
drop policy if exists "noticias_select" on public.noticias;
create policy "noticias_select" on public.noticias for select using (publicada = true or public.get_perfil() is not null);

-- 5) Supabase Storage
-- Bucket privado para fichas de associados, anexos RGA e documentos internos
insert into storage.buckets (id, name, public)
values ('aac-arquivos', 'aac-arquivos', false)
on conflict (id) do nothing;

-- Bucket público para imagens de notícias que podem aparecer no site público
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
for select using (bucket_id = 'aac-arquivos' and public.get_perfil() is not null);

create policy "aac_arquivos_insert_auth" on storage.objects
for insert with check (bucket_id = 'aac-arquivos' and public.get_perfil() in ('admin','presidencia','secretaria','tesouraria','bem_estar_animal','conselho_fiscal'));

create policy "aac_arquivos_update_auth" on storage.objects
for update using (bucket_id = 'aac-arquivos' and public.get_perfil() in ('admin','presidencia','secretaria','tesouraria','bem_estar_animal','conselho_fiscal'))
with check (bucket_id = 'aac-arquivos' and public.get_perfil() in ('admin','presidencia','secretaria','tesouraria','bem_estar_animal','conselho_fiscal'));

create policy "aac_arquivos_delete_admin" on storage.objects
for delete using (bucket_id = 'aac-arquivos' and public.get_perfil() in ('admin','presidencia'));

create policy "aac_publico_select_public" on storage.objects
for select using (bucket_id = 'aac-publico');

create policy "aac_publico_insert_auth" on storage.objects
for insert with check (bucket_id = 'aac-publico' and public.get_perfil() in ('admin','presidencia','secretaria'));

create policy "aac_publico_update_auth" on storage.objects
for update using (bucket_id = 'aac-publico' and public.get_perfil() in ('admin','presidencia','secretaria'))
with check (bucket_id = 'aac-publico' and public.get_perfil() in ('admin','presidencia','secretaria'));

create policy "aac_publico_delete_admin" on storage.objects
for delete using (bucket_id = 'aac-publico' and public.get_perfil() in ('admin','presidencia'));
