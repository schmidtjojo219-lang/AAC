-- Painel Interno AAC - Atualização V4
-- Mensalidades completas, baixa, recibos e relatórios da tesouraria.
-- Execute uma vez no Supabase: SQL Editor > New query > Run.

create extension if not exists "pgcrypto";

-- Campos extras para controle financeiro de mensalidades
alter table public.mensalidades add column if not exists numero_recibo text;
alter table public.mensalidades add column if not exists recibo_emitido_em timestamptz;
alter table public.mensalidades add column if not exists recebido_por text;
alter table public.mensalidades add column if not exists desconto numeric(12,2) not null default 0;
alter table public.mensalidades add column if not exists observacoes_quitacao text;
alter table public.mensalidades add column if not exists financeiro_id uuid references public.financeiro(id) on delete set null;
alter table public.mensalidades add column if not exists updated_by uuid references auth.users(id) on delete set null;

create unique index if not exists mensalidades_numero_recibo_unique
on public.mensalidades(numero_recibo)
where numero_recibo is not null and numero_recibo <> '';

create index if not exists mensalidades_status_vencimento_idx
on public.mensalidades(status, data_vencimento);

create index if not exists mensalidades_competencia_idx
on public.mensalidades(competencia);

-- Função segura para atualizar updated_at/updated_by em mensalidades
create or replace function public.touch_mensalidades()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at = now();
  new.updated_by = auth.uid();
  return new;
end;
$$;

drop trigger if exists mensalidades_touch_update on public.mensalidades;
create trigger mensalidades_touch_update
before update on public.mensalidades
for each row execute function public.touch_mensalidades();

-- View administrativa resumida para relatórios internos.
-- Não é pública; segue RLS das tabelas e só usuários logados podem consultar.
create or replace view public.resumo_mensalidades_associados
with (security_barrier = true)
as
select
  a.id as associado_id,
  a.nome_completo,
  a.matricula,
  a.numero_ficha,
  a.status as status_associado,
  count(m.id) filter (
    where m.status in ('aberto','atrasado') and m.data_vencimento < current_date
  )::int as parcelas_vencidas,
  coalesce(sum((m.valor + coalesce(m.juros,0) - coalesce(m.desconto,0))) filter (
    where m.status in ('aberto','atrasado') and m.data_vencimento < current_date
  ),0)::numeric(12,2) as valor_vencido,
  count(m.id) filter (where m.status = 'pago')::int as parcelas_pagas,
  coalesce(sum(coalesce(m.valor_pago,0)) filter (where m.status = 'pago'),0)::numeric(12,2) as valor_pago_total,
  max(m.data_vencimento) filter (where m.status in ('aberto','atrasado') and m.data_vencimento < current_date) as ultimo_vencimento_em_aberto
from public.associados a
left join public.mensalidades m on m.associado_id = a.id
group by a.id, a.nome_completo, a.matricula, a.numero_ficha, a.status;

grant select on public.resumo_mensalidades_associados to authenticated;

comment on view public.resumo_mensalidades_associados is 'Resumo interno de mensalidades por associado para tesouraria e conselho fiscal.';

notify pgrst, 'reload schema';
