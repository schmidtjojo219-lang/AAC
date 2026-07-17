-- Painel Interno AAC - Atualização V6
-- Execute uma vez no Supabase: SQL Editor > New query > Run.
-- Inclui: Atas, lista de presença, protocolos, biblioteca documental e metadados de emissão/cadastro.

create extension if not exists "pgcrypto";

-- 1) Metadados simples de cadastro/atualização nos associados e RGA
alter table public.associados add column if not exists cadastrado_por_nome text;
alter table public.associados add column if not exists cadastrado_por_email text;
alter table public.associados add column if not exists atualizado_por_nome text;
alter table public.associados add column if not exists atualizado_por_email text;

alter table public.animais add column if not exists cadastrado_por_nome text;
alter table public.animais add column if not exists cadastrado_por_email text;
alter table public.animais add column if not exists atualizado_por_nome text;
alter table public.animais add column if not exists atualizado_por_email text;

-- 2) Atas e listas de presença
create table if not exists public.atas (
  id uuid primary key default gen_random_uuid(),
  tipo text not null default 'Ata de Reunião da Diretoria Executiva',
  titulo text not null,
  data_reuniao date default current_date,
  horario text,
  local text,
  presidencia text,
  secretaria text,
  pauta text,
  deliberacoes text,
  presentes text,
  observacoes text,
  status text not null default 'rascunho' check (status in ('rascunho','aprovada','arquivada')),
  cadastrado_por_nome text,
  cadastrado_por_email text,
  atualizado_por_nome text,
  atualizado_por_email text,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.atas enable row level security;

drop policy if exists "atas_select" on public.atas;
drop policy if exists "atas_insert" on public.atas;
drop policy if exists "atas_update" on public.atas;
drop policy if exists "atas_delete" on public.atas;

create policy "atas_select" on public.atas
for select using (public.get_perfil() is not null);

create policy "atas_insert" on public.atas
for insert with check (public.get_perfil() in ('admin','presidencia','secretaria','conselho_fiscal'));

create policy "atas_update" on public.atas
for update using (public.get_perfil() in ('admin','presidencia','secretaria','conselho_fiscal'))
with check (public.get_perfil() in ('admin','presidencia','secretaria','conselho_fiscal'));

create policy "atas_delete" on public.atas
for delete using (public.get_perfil() in ('admin','presidencia','secretaria'));

create index if not exists atas_data_idx on public.atas(data_reuniao desc);
create index if not exists atas_status_idx on public.atas(status);

-- 3) Protocolos enviados/recebidos
create table if not exists public.protocolos (
  id uuid primary key default gen_random_uuid(),
  numero_protocolo text,
  orgao text not null,
  assunto text not null,
  data_envio date default current_date,
  prazo_resposta date,
  responsavel text,
  status text not null default 'em_andamento' check (status in ('em_andamento','respondido','pendente','atrasado','encerrado')),
  observacoes text,
  arquivo_path text,
  cadastrado_por_nome text,
  cadastrado_por_email text,
  atualizado_por_nome text,
  atualizado_por_email text,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.protocolos enable row level security;

drop policy if exists "protocolos_select" on public.protocolos;
drop policy if exists "protocolos_insert" on public.protocolos;
drop policy if exists "protocolos_update" on public.protocolos;
drop policy if exists "protocolos_delete" on public.protocolos;

create policy "protocolos_select" on public.protocolos
for select using (public.get_perfil() is not null);

create policy "protocolos_insert" on public.protocolos
for insert with check (public.get_perfil() in ('admin','presidencia','secretaria','conselho_fiscal'));

create policy "protocolos_update" on public.protocolos
for update using (public.get_perfil() in ('admin','presidencia','secretaria','conselho_fiscal'))
with check (public.get_perfil() in ('admin','presidencia','secretaria','conselho_fiscal'));

create policy "protocolos_delete" on public.protocolos
for delete using (public.get_perfil() in ('admin','presidencia','secretaria'));

create index if not exists protocolos_data_idx on public.protocolos(data_envio desc);
create index if not exists protocolos_status_idx on public.protocolos(status);
create index if not exists protocolos_prazo_idx on public.protocolos(prazo_resposta);

-- 4) Biblioteca documental estruturada
create table if not exists public.biblioteca_documentos (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  categoria text not null default 'Institucional',
  tipo text default 'PDF',
  data_documento date,
  visibilidade text not null default 'diretoria' check (visibilidade in ('diretoria','conselho_fiscal','todos')),
  descricao text,
  arquivo_path text,
  url_arquivo text,
  cadastrado_por_nome text,
  cadastrado_por_email text,
  atualizado_por_nome text,
  atualizado_por_email text,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.biblioteca_documentos enable row level security;

drop policy if exists "biblioteca_documentos_select" on public.biblioteca_documentos;
drop policy if exists "biblioteca_documentos_insert" on public.biblioteca_documentos;
drop policy if exists "biblioteca_documentos_update" on public.biblioteca_documentos;
drop policy if exists "biblioteca_documentos_delete" on public.biblioteca_documentos;

create policy "biblioteca_documentos_select" on public.biblioteca_documentos
for select using (
  public.get_perfil() is not null and (
    visibilidade = 'todos'
    or public.get_perfil() in ('admin','presidencia','secretaria')
    or (visibilidade = 'conselho_fiscal' and public.get_perfil() = 'conselho_fiscal')
    or (visibilidade = 'diretoria' and public.get_perfil() in ('tesouraria','bem_estar_animal'))
  )
);

create policy "biblioteca_documentos_insert" on public.biblioteca_documentos
for insert with check (public.get_perfil() in ('admin','presidencia','secretaria','tesouraria','conselho_fiscal'));

create policy "biblioteca_documentos_update" on public.biblioteca_documentos
for update using (public.get_perfil() in ('admin','presidencia','secretaria','tesouraria','conselho_fiscal'))
with check (public.get_perfil() in ('admin','presidencia','secretaria','tesouraria','conselho_fiscal'));

create policy "biblioteca_documentos_delete" on public.biblioteca_documentos
for delete using (public.get_perfil() in ('admin','presidencia','secretaria'));

create index if not exists biblioteca_documentos_categoria_idx on public.biblioteca_documentos(categoria);
create index if not exists biblioteca_documentos_data_idx on public.biblioteca_documentos(data_documento desc);

-- 5) Função simples para updated_at
create or replace function public.touch_registro_v6()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists atas_touch_update on public.atas;
create trigger atas_touch_update before update on public.atas for each row execute function public.touch_registro_v6();

drop trigger if exists protocolos_touch_update on public.protocolos;
create trigger protocolos_touch_update before update on public.protocolos for each row execute function public.touch_registro_v6();

drop trigger if exists biblioteca_documentos_touch_update on public.biblioteca_documentos;
create trigger biblioteca_documentos_touch_update before update on public.biblioteca_documentos for each row execute function public.touch_registro_v6();

-- 6) Views de apoio para prazos/documentos pendentes
create or replace view public.protocolos_pendentes
with (security_barrier = true)
as
select *,
  case
    when status not in ('respondido','encerrado') and prazo_resposta is not null and prazo_resposta < current_date then 'Prazo vencido'
    when status not in ('respondido','encerrado') and prazo_resposta is not null and prazo_resposta <= current_date + interval '7 days' then 'Prazo próximo'
    else 'Em acompanhamento'
  end as alerta_prazo
from public.protocolos
where status not in ('respondido','encerrado');

grant select on public.protocolos_pendentes to authenticated;
grant select, insert, update, delete on public.atas to authenticated;
grant select, insert, update, delete on public.protocolos to authenticated;
grant select, insert, update, delete on public.biblioteca_documentos to authenticated;

comment on table public.atas is 'Atas de reuniões, assembleias, posse e prestação de contas da AAC.';
comment on table public.protocolos is 'Controle de protocolos enviados/recebidos pela AAC.';
comment on table public.biblioteca_documentos is 'Biblioteca documental estruturada da AAC.';

notify pgrst, 'reload schema';
