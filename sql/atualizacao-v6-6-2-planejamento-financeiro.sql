-- AAC Painel Interno v6.6
-- Planejamento Financeiro por Fundos + Prestação de Contas com validação pública
-- Execute no Supabase SQL Editor uma única vez.

create extension if not exists "pgcrypto";

-- =========================================================
-- 1) PLANEJAMENTOS FINANCEIROS
-- =========================================================
create table if not exists public.planejamentos_financeiros (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  mes_inicio text not null,
  mes_fim text not null,
  taxa_operacional numeric(12,2) not null default 0.99,
  observacoes text,
  status text not null default 'ativo' check (status in ('rascunho','ativo','encerrado','cancelado')),
  cadastrado_por_nome text,
  cadastrado_por_email text,
  atualizado_por_nome text,
  atualizado_por_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.planejamentos_financeiros add column if not exists titulo text;
alter table public.planejamentos_financeiros add column if not exists mes_inicio text;
alter table public.planejamentos_financeiros add column if not exists mes_fim text;
alter table public.planejamentos_financeiros add column if not exists taxa_operacional numeric(12,2) not null default 0.99;
alter table public.planejamentos_financeiros add column if not exists observacoes text;
alter table public.planejamentos_financeiros add column if not exists status text not null default 'ativo';
alter table public.planejamentos_financeiros add column if not exists cadastrado_por_nome text;
alter table public.planejamentos_financeiros add column if not exists cadastrado_por_email text;
alter table public.planejamentos_financeiros add column if not exists atualizado_por_nome text;
alter table public.planejamentos_financeiros add column if not exists atualizado_por_email text;
alter table public.planejamentos_financeiros add column if not exists updated_at timestamptz not null default now();

create table if not exists public.planejamento_fundos (
  id uuid primary key default gen_random_uuid(),
  planejamento_id uuid not null references public.planejamentos_financeiros(id) on delete cascade,
  nome text not null,
  percentual numeric(7,4) not null default 0,
  ordem integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.planejamento_fundos add column if not exists planejamento_id uuid references public.planejamentos_financeiros(id) on delete cascade;
alter table public.planejamento_fundos add column if not exists nome text;
alter table public.planejamento_fundos add column if not exists percentual numeric(7,4) not null default 0;
alter table public.planejamento_fundos add column if not exists ordem integer not null default 0;

create table if not exists public.planejamento_receitas (
  id uuid primary key default gen_random_uuid(),
  planejamento_id uuid not null references public.planejamentos_financeiros(id) on delete cascade,
  descricao text not null,
  valor_estimado numeric(12,2) not null default 0,
  recorrente boolean not null default false,
  mes_alvo text,
  observacoes text,
  ordem integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.planejamento_receitas add column if not exists planejamento_id uuid references public.planejamentos_financeiros(id) on delete cascade;
alter table public.planejamento_receitas add column if not exists descricao text;
alter table public.planejamento_receitas add column if not exists valor_estimado numeric(12,2) not null default 0;
alter table public.planejamento_receitas add column if not exists recorrente boolean not null default false;
alter table public.planejamento_receitas add column if not exists mes_alvo text;
alter table public.planejamento_receitas add column if not exists observacoes text;
alter table public.planejamento_receitas add column if not exists ordem integer not null default 0;

create index if not exists planejamentos_financeiros_periodo_idx on public.planejamentos_financeiros(mes_inicio, mes_fim);
create index if not exists planejamento_fundos_planejamento_idx on public.planejamento_fundos(planejamento_id);
create index if not exists planejamento_receitas_planejamento_idx on public.planejamento_receitas(planejamento_id);

-- =========================================================
-- 2) CAMPOS DE VÍNCULO NO FINANCEIRO
-- =========================================================
-- Correção v6.6.1: alguns bancos ficaram sem a tabela public.financeiro
-- por não terem recebido o schema inicial completo. Este bloco cria a
-- tabela base, se ela ainda não existir, antes de adicionar os campos novos.
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

alter table public.financeiro enable row level security;

drop policy if exists "financeiro_select" on public.financeiro;
drop policy if exists "financeiro_insert" on public.financeiro;
drop policy if exists "financeiro_update" on public.financeiro;
drop policy if exists "financeiro_delete" on public.financeiro;

create policy "financeiro_select" on public.financeiro
for select using (public.get_perfil() is not null);

create policy "financeiro_insert" on public.financeiro
for insert with check (public.get_perfil() in ('admin','presidencia','tesouraria','conselho_fiscal'));

create policy "financeiro_update" on public.financeiro
for update using (public.get_perfil() in ('admin','presidencia','tesouraria','conselho_fiscal'))
with check (public.get_perfil() in ('admin','presidencia','tesouraria','conselho_fiscal'));

create policy "financeiro_delete" on public.financeiro
for delete using (public.get_perfil() in ('admin','presidencia','tesouraria'));

grant select, insert, update, delete on public.financeiro to authenticated;

-- Garante também a existência da tabela de validações públicas caso o SQL da v6.4
-- não tenha sido executado completamente no banco.
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

alter table public.documentos_validacoes enable row level security;
grant select, insert, update on public.documentos_validacoes to authenticated;
grant select on public.documentos_validacoes to anon;

alter table public.financeiro add column if not exists planejamento_id uuid references public.planejamentos_financeiros(id) on delete set null;
alter table public.financeiro add column if not exists fundo_id uuid references public.planejamento_fundos(id) on delete set null;
alter table public.financeiro add column if not exists fundo_nome text;
alter table public.financeiro add column if not exists valor_bruto numeric(12,2);
alter table public.financeiro add column if not exists taxa_operacional numeric(12,2) default 0;
alter table public.financeiro add column if not exists valor_liquido numeric(12,2);
alter table public.financeiro add column if not exists grupo_distribuicao_id uuid;

create index if not exists financeiro_planejamento_idx on public.financeiro(planejamento_id);
create index if not exists financeiro_fundo_idx on public.financeiro(fundo_id);
create index if not exists financeiro_grupo_distribuicao_idx on public.financeiro(grupo_distribuicao_id);

-- =========================================================
-- 3) VALIDAÇÃO PÚBLICA PARA NOVOS DOCUMENTOS
-- =========================================================
alter table public.documentos_validacoes add column if not exists planejamento_id uuid;
alter table public.documentos_validacoes add column if not exists prestacao_contas_periodo text;

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

grant select on public.consulta_publica_documentos to anon, authenticated;

-- =========================================================
-- 4) RLS
-- =========================================================
alter table public.planejamentos_financeiros enable row level security;
alter table public.planejamento_fundos enable row level security;
alter table public.planejamento_receitas enable row level security;

drop policy if exists "planejamentos_select_auth" on public.planejamentos_financeiros;
drop policy if exists "planejamentos_insert_financeiro" on public.planejamentos_financeiros;
drop policy if exists "planejamentos_update_financeiro" on public.planejamentos_financeiros;
drop policy if exists "planejamentos_delete_admin" on public.planejamentos_financeiros;

create policy "planejamentos_select_auth" on public.planejamentos_financeiros
for select using (public.get_perfil() is not null);

create policy "planejamentos_insert_financeiro" on public.planejamentos_financeiros
for insert with check (public.get_perfil() in ('admin','presidencia','tesouraria','conselho_fiscal'));

create policy "planejamentos_update_financeiro" on public.planejamentos_financeiros
for update using (public.get_perfil() in ('admin','presidencia','tesouraria','conselho_fiscal'))
with check (public.get_perfil() in ('admin','presidencia','tesouraria','conselho_fiscal'));

create policy "planejamentos_delete_admin" on public.planejamentos_financeiros
for delete using (public.get_perfil() in ('admin','presidencia','tesouraria'));

-- Fundos

drop policy if exists "fundos_select_auth" on public.planejamento_fundos;
drop policy if exists "fundos_insert_financeiro" on public.planejamento_fundos;
drop policy if exists "fundos_update_financeiro" on public.planejamento_fundos;
drop policy if exists "fundos_delete_financeiro" on public.planejamento_fundos;

create policy "fundos_select_auth" on public.planejamento_fundos
for select using (public.get_perfil() is not null);

create policy "fundos_insert_financeiro" on public.planejamento_fundos
for insert with check (public.get_perfil() in ('admin','presidencia','tesouraria','conselho_fiscal'));

create policy "fundos_update_financeiro" on public.planejamento_fundos
for update using (public.get_perfil() in ('admin','presidencia','tesouraria','conselho_fiscal'))
with check (public.get_perfil() in ('admin','presidencia','tesouraria','conselho_fiscal'));

create policy "fundos_delete_financeiro" on public.planejamento_fundos
for delete using (public.get_perfil() in ('admin','presidencia','tesouraria','conselho_fiscal'));

-- Receitas esperadas

drop policy if exists "receitas_planejadas_select_auth" on public.planejamento_receitas;
drop policy if exists "receitas_planejadas_insert_financeiro" on public.planejamento_receitas;
drop policy if exists "receitas_planejadas_update_financeiro" on public.planejamento_receitas;
drop policy if exists "receitas_planejadas_delete_financeiro" on public.planejamento_receitas;

create policy "receitas_planejadas_select_auth" on public.planejamento_receitas
for select using (public.get_perfil() is not null);

create policy "receitas_planejadas_insert_financeiro" on public.planejamento_receitas
for insert with check (public.get_perfil() in ('admin','presidencia','tesouraria','conselho_fiscal'));

create policy "receitas_planejadas_update_financeiro" on public.planejamento_receitas
for update using (public.get_perfil() in ('admin','presidencia','tesouraria','conselho_fiscal'))
with check (public.get_perfil() in ('admin','presidencia','tesouraria','conselho_fiscal'));

create policy "receitas_planejadas_delete_financeiro" on public.planejamento_receitas
for delete using (public.get_perfil() in ('admin','presidencia','tesouraria','conselho_fiscal'));

-- Grants

grant select, insert, update, delete on public.planejamentos_financeiros to authenticated;
grant select, insert, update, delete on public.planejamento_fundos to authenticated;
grant select, insert, update, delete on public.planejamento_receitas to authenticated;
grant select on public.consulta_publica_documentos to anon, authenticated;

notify pgrst, 'reload schema';

-- =========================================================
-- v6.6.2 — regras reais de mensalidade, taxa boleto e prestação por fundos
-- =========================================================

alter table public.planejamentos_financeiros
  add column if not exists valor_mensalidade numeric(12,2) not null default 25,
  add column if not exists associados_previstos integer not null default 0;

alter table public.planejamento_receitas
  add column if not exists regra_distribuicao text not null default 'percentual',
  add column if not exists fundo_destino_id uuid references public.planejamento_fundos(id) on delete set null,
  add column if not exists distribuicao_manual jsonb not null default '{}'::jsonb;

alter table public.financeiro
  add column if not exists mensalidade_id uuid references public.mensalidades(id) on delete set null,
  add column if not exists origem text,
  add column if not exists competencia text;

alter table public.mensalidades
  add column if not exists financeiro_taxa_id uuid references public.financeiro(id) on delete set null;

create index if not exists financeiro_mensalidade_idx on public.financeiro(mensalidade_id);
create index if not exists financeiro_origem_idx on public.financeiro(origem);
create index if not exists financeiro_competencia_idx on public.financeiro(competencia);
create index if not exists planejamento_receitas_regra_idx on public.planejamento_receitas(regra_distribuicao);

comment on column public.financeiro.origem is 'Origem técnica do lançamento: mensalidade_liquida, taxa_boleto_mensalidade, lancamento_manual etc.';
comment on column public.financeiro.competencia is 'Competência YYYY-MM vinculada ao lançamento, quando aplicável.';
comment on column public.planejamentos_financeiros.associados_previstos is 'Quantidade de associados ativos/pagantes prevista no planejamento.';
comment on column public.planejamentos_financeiros.valor_mensalidade is 'Valor padrão da mensalidade utilizado na previsão orçamentária.';
comment on column public.planejamento_receitas.regra_distribuicao is 'percentual, igual, fundo_especifico ou manual.';

notify pgrst, 'reload schema';
