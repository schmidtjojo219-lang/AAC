-- Painel Interno AAC - Atualização V3
-- Consulta pública para QR Codes de associados e RGA.
-- Execute uma vez no Supabase: SQL Editor > New query > Run.
-- Não expõe CPF, RG, endereço, telefone, e-mail pessoal nem arquivos anexados.

create extension if not exists "pgcrypto";

-- Consulta pública de associados.
-- O código usado na URL será, preferencialmente, a matrícula; se não houver, usa número da ficha; se não houver, usa o UUID.
create or replace view public.consulta_publica_associados
with (security_barrier = true)
as
select
  a.id,
  coalesce(nullif(trim(a.matricula), ''), nullif(trim(a.numero_ficha), ''), a.id::text) as codigo,
  lower(coalesce(nullif(trim(a.matricula), ''), nullif(trim(a.numero_ficha), ''), a.id::text)) as codigo_normalizado,
  a.nome_completo,
  coalesce(nullif(trim(a.matricula), ''), nullif(trim(a.numero_ficha), '')) as matricula,
  a.numero_ficha,
  a.tipo_cadastro,
  a.status,
  case
    when a.status = 'aprovado' then 'Ativo'
    when a.status = 'inativo' then 'Inativo'
    when a.status = 'pendente' then 'Pendente'
    when a.status = 'reprovado' then 'Reprovado'
    else 'Não informado'
  end as situacao_publica,
  a.data_admissao,
  (
    select count(*)::int
    from public.mensalidades m
    where m.associado_id = a.id
      and m.status in ('aberto','atrasado')
      and m.data_vencimento < current_date
  ) as parcelas_vencidas,
  case
    when exists (
      select 1
      from public.mensalidades m
      where m.associado_id = a.id
        and m.status in ('aberto','atrasado')
        and m.data_vencimento < current_date
    ) then 'Pendência'
    else 'Regular'
  end as status_financeiro,
  a.created_at,
  a.updated_at
from public.associados a
where a.status in ('aprovado','inativo');

-- Consulta pública de RGA.
-- O código usado na URL será, preferencialmente, o número do RGA; se não houver, usa o UUID do animal.
create or replace view public.consulta_publica_rga
with (security_barrier = true)
as
select
  an.id,
  coalesce(nullif(trim(an.rga), ''), an.id::text) as codigo,
  lower(coalesce(nullif(trim(an.rga), ''), an.id::text)) as codigo_normalizado,
  an.rga,
  an.nome_animal,
  coalesce(an.especie, 'Equino') as especie,
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
  an.exame_aie_status,
  an.exame_mormo_status,
  an.vacinas_status,
  an.estado_fisico_status,
  an.cascos_status,
  an.data_vistoria,
  an.updated_at,
  aa.nome_completo as proprietario_nome,
  coalesce(nullif(trim(aa.matricula), ''), nullif(trim(aa.numero_ficha), '')) as proprietario_matricula
from public.animais an
left join public.associados aa on aa.id = an.associado_id
where an.status_rga in ('ativo','suspenso','inativo')
  and (aa.id is null or aa.status in ('aprovado','inativo'));

-- Garante que o navegador, sem login, consiga ler APENAS essas views públicas.
grant usage on schema public to anon, authenticated;
grant select on public.consulta_publica_associados to anon, authenticated;
grant select on public.consulta_publica_rga to anon, authenticated;

comment on view public.consulta_publica_associados is 'Dados públicos e reduzidos para validação por QR Code de associado da AAC. Não expõe CPF, RG, endereço, telefone, e-mail ou anexos.';
comment on view public.consulta_publica_rga is 'Dados públicos e reduzidos para validação por QR Code de RGA da AAC. Não expõe dados sensíveis do proprietário nem anexos.';
