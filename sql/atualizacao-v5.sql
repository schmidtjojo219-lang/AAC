-- Painel Interno AAC - Atualização V5
-- Prontuário completo do animal/RGA: fotos, vistorias, controle sanitário e alertas.
-- Execute uma vez no Supabase: SQL Editor > New query > Run.

create extension if not exists "pgcrypto";


-- 0) Numeração automática institucional
-- Gera automaticamente, ao salvar sem preencher:
-- Associado: matrícula AAC-0001 e Nº da ficha 0001/2026
-- Animal/RGA: AAC-RGA-0001/2026

create or replace function public.gerar_matricula_aac()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  prox integer;
begin
  select coalesce(max(substring(matricula from '^AAC-([0-9]+)$')::integer), 0) + 1
    into prox
  from public.associados
  where matricula ~ '^AAC-[0-9]+$';

  return 'AAC-' || lpad(prox::text, 4, '0');
end;
$$;

create or replace function public.gerar_numero_ficha_aac(data_base date default current_date)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  ano integer := extract(year from coalesce(data_base, current_date))::integer;
  prox integer;
begin
  select coalesce(max(substring(numero_ficha from ('^([0-9]+)/' || ano || '$'))::integer), 0) + 1
    into prox
  from public.associados
  where numero_ficha ~ ('^[0-9]+/' || ano || '$');

  return lpad(prox::text, 4, '0') || '/' || ano;
end;
$$;

create or replace function public.gerar_rga_aac(data_base date default current_date)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  ano integer := extract(year from coalesce(data_base, current_date))::integer;
  prox integer;
begin
  select coalesce(max(substring(rga from ('^AAC-RGA-([0-9]+)/' || ano || '$'))::integer), 0) + 1
    into prox
  from public.animais
  where rga ~ ('^AAC-RGA-[0-9]+/' || ano || '$');

  return 'AAC-RGA-' || lpad(prox::text, 4, '0') || '/' || ano;
end;
$$;

create or replace function public.preencher_numeracao_associado_aac()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if nullif(trim(coalesce(new.matricula, '')), '') is null then
    new.matricula := public.gerar_matricula_aac();
  end if;

  if nullif(trim(coalesce(new.numero_ficha, '')), '') is null then
    new.numero_ficha := public.gerar_numero_ficha_aac(coalesce(new.data_admissao, current_date));
  end if;

  if new.data_admissao is null then
    new.data_admissao := current_date;
  end if;

  return new;
end;
$$;

drop trigger if exists associados_numeracao_aac on public.associados;
create trigger associados_numeracao_aac
before insert on public.associados
for each row execute function public.preencher_numeracao_associado_aac();

create or replace function public.preencher_numeracao_rga_aac()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if nullif(trim(coalesce(new.rga, '')), '') is null then
    new.rga := public.gerar_rga_aac(current_date);
  end if;
  return new;
end;
$$;

drop trigger if exists animais_numeracao_rga_aac on public.animais;
create trigger animais_numeracao_rga_aac
before insert on public.animais
for each row execute function public.preencher_numeracao_rga_aac();

-- Completa cadastros antigos que estejam sem matrícula, ficha ou RGA.
do $$
declare
  r record;
begin
  for r in select id from public.associados where nullif(trim(coalesce(matricula, '')), '') is null order by created_at, nome_completo loop
    update public.associados set matricula = public.gerar_matricula_aac() where id = r.id;
  end loop;

  for r in select id, data_admissao from public.associados where nullif(trim(coalesce(numero_ficha, '')), '') is null order by created_at, nome_completo loop
    update public.associados set numero_ficha = public.gerar_numero_ficha_aac(coalesce(r.data_admissao, current_date)) where id = r.id;
  end loop;

  for r in select id from public.animais where nullif(trim(coalesce(rga, '')), '') is null order by created_at, nome_animal loop
    update public.animais set rga = public.gerar_rga_aac(current_date) where id = r.id;
  end loop;
end;
$$;


-- 1) Novos campos no cadastro principal do animal/RGA
alter table public.animais add column if not exists raca text;
alter table public.animais add column if not exists data_nascimento date;
alter table public.animais add column if not exists porte text;
alter table public.animais add column if not exists peso_estimado text;
alter table public.animais add column if not exists finalidade_uso text;
alter table public.animais add column if not exists condicao_geral text check (condicao_geral is null or condicao_geral in ('apto','inapto','em_observacao','pendente_vistoria'));
alter table public.animais add column if not exists responsavel_vistoria text;
alter table public.animais add column if not exists proxima_vistoria date;
alter table public.animais add column if not exists foto_lateral_esquerda_path text;
alter table public.animais add column if not exists foto_lateral_direita_path text;
alter table public.animais add column if not exists foto_frontal_path text;
alter table public.animais add column if not exists foto_traseira_path text;
alter table public.animais add column if not exists foto_marcas_path text;
alter table public.animais add column if not exists foto_carroca_path text;
alter table public.animais add column if not exists exame_aie_data date;
alter table public.animais add column if not exists exame_aie_validade date;
alter table public.animais add column if not exists exame_aie_pdf_path text;
alter table public.animais add column if not exists exame_mormo_data date;
alter table public.animais add column if not exists exame_mormo_validade date;
alter table public.animais add column if not exists exame_mormo_pdf_path text;
alter table public.animais add column if not exists vacinas_data date;
alter table public.animais add column if not exists vacinas_validade date;
alter table public.animais add column if not exists vacinas_pdf_path text;
alter table public.animais add column if not exists vermifugacao_data date;
alter table public.animais add column if not exists vermifugacao_validade date;
alter table public.animais add column if not exists atendimento_veterinario_ultimo date;

create index if not exists animais_status_proxima_vistoria_idx on public.animais(status_rga, proxima_vistoria);
create index if not exists animais_validade_aie_idx on public.animais(exame_aie_validade);
create index if not exists animais_validade_mormo_idx on public.animais(exame_mormo_validade);
create index if not exists animais_validade_vacinas_idx on public.animais(vacinas_validade);

-- 2) Histórico de vistorias do animal
create table if not exists public.animal_vistorias (
  id uuid primary key default gen_random_uuid(),
  animal_id uuid not null references public.animais(id) on delete cascade,
  data_vistoria date not null default current_date,
  responsavel text,
  estado_fisico text check (estado_fisico is null or estado_fisico in ('apto','inapto','em_observacao')),
  cascos_ferraduras text check (cascos_ferraduras is null or cascos_ferraduras in ('bom','regular','ruim')),
  resultado text not null default 'pendente' check (resultado in ('apto','inapto','pendente','suspenso')),
  proxima_vistoria date,
  observacoes text,
  arquivo_pdf_path text,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.animal_vistorias enable row level security;

drop policy if exists "animal_vistorias_select" on public.animal_vistorias;
drop policy if exists "animal_vistorias_insert" on public.animal_vistorias;
drop policy if exists "animal_vistorias_update" on public.animal_vistorias;
drop policy if exists "animal_vistorias_delete" on public.animal_vistorias;

create policy "animal_vistorias_select" on public.animal_vistorias
for select using (public.get_perfil() is not null);

create policy "animal_vistorias_insert" on public.animal_vistorias
for insert with check (public.get_perfil() in ('admin','presidencia','secretaria','bem_estar_animal'));

create policy "animal_vistorias_update" on public.animal_vistorias
for update using (public.get_perfil() in ('admin','presidencia','secretaria','bem_estar_animal'))
with check (public.get_perfil() in ('admin','presidencia','secretaria','bem_estar_animal'));

create policy "animal_vistorias_delete" on public.animal_vistorias
for delete using (public.get_perfil() in ('admin','presidencia','bem_estar_animal'));

create index if not exists animal_vistorias_animal_data_idx on public.animal_vistorias(animal_id, data_vistoria desc);

-- 3) Controle sanitário em formato de prontuário
create table if not exists public.animal_controle_sanitario (
  id uuid primary key default gen_random_uuid(),
  animal_id uuid not null references public.animais(id) on delete cascade,
  tipo text not null check (tipo in ('AIE','MORMO','VACINA','VERMIFUGACAO','ATENDIMENTO','OUTRO')),
  descricao text,
  situacao text check (situacao is null or situacao in ('negativo','positivo','em_dia','pendente','realizado','vencido','apto','inapto','observacao')),
  data_registro date not null default current_date,
  validade date,
  responsavel text,
  observacoes text,
  arquivo_pdf_path text,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.animal_controle_sanitario enable row level security;

drop policy if exists "animal_controle_sanitario_select" on public.animal_controle_sanitario;
drop policy if exists "animal_controle_sanitario_insert" on public.animal_controle_sanitario;
drop policy if exists "animal_controle_sanitario_update" on public.animal_controle_sanitario;
drop policy if exists "animal_controle_sanitario_delete" on public.animal_controle_sanitario;

create policy "animal_controle_sanitario_select" on public.animal_controle_sanitario
for select using (public.get_perfil() is not null);

create policy "animal_controle_sanitario_insert" on public.animal_controle_sanitario
for insert with check (public.get_perfil() in ('admin','presidencia','secretaria','bem_estar_animal'));

create policy "animal_controle_sanitario_update" on public.animal_controle_sanitario
for update using (public.get_perfil() in ('admin','presidencia','secretaria','bem_estar_animal'))
with check (public.get_perfil() in ('admin','presidencia','secretaria','bem_estar_animal'));

create policy "animal_controle_sanitario_delete" on public.animal_controle_sanitario
for delete using (public.get_perfil() in ('admin','presidencia','bem_estar_animal'));

create index if not exists animal_controle_sanitario_animal_data_idx on public.animal_controle_sanitario(animal_id, data_registro desc);
create index if not exists animal_controle_sanitario_validade_idx on public.animal_controle_sanitario(validade);

-- 4) Atualização automática do updated_at
create or replace function public.touch_animal_prontuario()
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

drop trigger if exists animal_vistorias_touch_update on public.animal_vistorias;
create trigger animal_vistorias_touch_update
before update on public.animal_vistorias
for each row execute function public.touch_animal_prontuario();

drop trigger if exists animal_controle_sanitario_touch_update on public.animal_controle_sanitario;
create trigger animal_controle_sanitario_touch_update
before update on public.animal_controle_sanitario
for each row execute function public.touch_animal_prontuario();

-- 5) View interna de alertas do RGA/Bem-Estar Animal
create or replace view public.alertas_animais
with (security_barrier = true)
as
select
  an.id,
  an.rga,
  an.nome_animal,
  an.status_rga,
  an.condicao_geral,
  an.proxima_vistoria,
  an.exame_aie_validade,
  an.exame_mormo_validade,
  an.vacinas_validade,
  aa.nome_completo as proprietario_nome,
  coalesce(nullif(trim(aa.matricula), ''), nullif(trim(aa.numero_ficha), '')) as proprietario_matricula,
  case
    when an.status_rga = 'suspenso' then 'RGA suspenso'
    when an.status_rga = 'pendente' then 'RGA pendente'
    when an.condicao_geral = 'inapto' then 'Animal inapto'
    when an.exame_aie_validade is not null and an.exame_aie_validade < current_date then 'AIE vencido'
    when an.exame_mormo_validade is not null and an.exame_mormo_validade < current_date then 'Mormo vencido'
    when an.vacinas_validade is not null and an.vacinas_validade < current_date then 'Vacinas vencidas'
    when an.proxima_vistoria is not null and an.proxima_vistoria < current_date then 'Vistoria vencida'
    when an.proxima_vistoria is not null and an.proxima_vistoria <= current_date + interval '30 days' then 'Vistoria próxima'
    else null
  end as alerta_principal
from public.animais an
left join public.associados aa on aa.id = an.associado_id
where
  an.status_rga in ('pendente','suspenso')
  or an.condicao_geral = 'inapto'
  or (an.exame_aie_validade is not null and an.exame_aie_validade < current_date)
  or (an.exame_mormo_validade is not null and an.exame_mormo_validade < current_date)
  or (an.vacinas_validade is not null and an.vacinas_validade < current_date)
  or (an.proxima_vistoria is not null and an.proxima_vistoria <= current_date + interval '30 days');

grant select on public.alertas_animais to authenticated;

-- 6) Atualiza consulta pública de RGA com dados não sensíveis adicionais
-- Importante: dropa a view antiga antes de recriar para evitar erro de mudança de ordem/nome de coluna.
drop view if exists public.consulta_publica_rga;
create view public.consulta_publica_rga
with (security_barrier = true)
as
select
  an.id,
  coalesce(nullif(trim(an.rga), ''), an.id::text) as codigo,
  lower(coalesce(nullif(trim(an.rga), ''), an.id::text)) as codigo_normalizado,
  an.rga,
  an.nome_animal,
  coalesce(an.especie, 'Equino') as especie,
  an.raca,
  an.sexo,
  an.cor_pelagem as pelagem,
  an.cor_pelagem,
  an.idade_estimada,
  an.marcas_especificas,
  an.status_rga,
  case
    when an.status_rga = 'ativo' then 'Ativo'
    when an.status_rga = 'suspenso' then 'Suspenso'
    when an.status_rga = 'inativo' then 'Inativo'
    when an.status_rga = 'pendente' then 'Pendente'
    else 'Não informado'
  end as situacao_publica,
  an.condicao_geral,
  an.exame_aie_status,
  an.exame_aie_validade,
  an.exame_mormo_status,
  an.exame_mormo_validade,
  an.vacinas_status,
  an.vacinas_validade,
  an.estado_fisico_status,
  an.cascos_status,
  an.data_vistoria,
  an.proxima_vistoria,
  an.updated_at,
  aa.nome_completo as proprietario_nome,
  coalesce(nullif(trim(aa.matricula), ''), nullif(trim(aa.numero_ficha), '')) as proprietario_matricula
from public.animais an
left join public.associados aa on aa.id = an.associado_id
where an.status_rga in ('ativo','suspenso','inativo')
  and (aa.id is null or aa.status in ('aprovado','inativo'));

grant usage on schema public to anon, authenticated;
grant select on public.consulta_publica_rga to anon, authenticated;

comment on table public.animal_vistorias is 'Histórico de vistorias do animal/RGA para prontuário de bem-estar animal.';
comment on table public.animal_controle_sanitario is 'Registros sanitários do animal: exames, vacinas, vermifugação e atendimentos.';
comment on view public.alertas_animais is 'Alertas internos de RGA, exames, vacinas e vistorias.';

notify pgrst, 'reload schema';
