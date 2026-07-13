-- AAC Painel Interno v7.1
-- Documentos profissionais: editor corrigido, modelos AAC, associados como interessados/assinantes,
-- assinaturas oficiais em PNG, documentos gerados assinaveis e correcao do hash SQL.
-- Execute este arquivo no Supabase SQL Editor depois da v6.6.2.

create extension if not exists "pgcrypto";

-- =========================================================
-- 1) ASSOCIADOS: comunicacao, email opcional e isencoes
-- =========================================================
alter table public.associados add column if not exists sem_email boolean not null default false;
alter table public.associados add column if not exists autoriza_whatsapp_oficial boolean not null default true;
alter table public.associados add column if not exists isencao_mensalidade text not null default 'sem_isencao';
alter table public.associados add column if not exists isencao_ate date;
alter table public.associados add column if not exists motivo_isencao text;

-- =========================================================
-- 2) PROCESSOS ADMINISTRATIVOS
-- =========================================================
create table if not exists public.processos_administrativos (
  id uuid primary key default gen_random_uuid(),
  numero_processo text unique,
  titulo text not null,
  tipo text not null default 'Administrativo',
  status text not null default 'aberto',
  interessado text,
  prioridade text not null default 'normal',
  data_abertura date not null default current_date,
  descricao text,
  cadastrado_por_nome text,
  cadastrado_por_email text,
  atualizado_por_nome text,
  atualizado_por_email text,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.processos_administrativos add column if not exists numero_processo text;
alter table public.processos_administrativos add column if not exists titulo text;
alter table public.processos_administrativos add column if not exists tipo text not null default 'Administrativo';
alter table public.processos_administrativos add column if not exists status text not null default 'aberto';
alter table public.processos_administrativos add column if not exists interessado text;
alter table public.processos_administrativos add column if not exists prioridade text not null default 'normal';
alter table public.processos_administrativos add column if not exists data_abertura date not null default current_date;
alter table public.processos_administrativos add column if not exists descricao text;
alter table public.processos_administrativos add column if not exists cadastrado_por_nome text;
alter table public.processos_administrativos add column if not exists cadastrado_por_email text;
alter table public.processos_administrativos add column if not exists atualizado_por_nome text;
alter table public.processos_administrativos add column if not exists atualizado_por_email text;
alter table public.processos_administrativos add column if not exists updated_at timestamptz not null default now();

create index if not exists processos_administrativos_status_idx on public.processos_administrativos(status);
create index if not exists processos_administrativos_tipo_idx on public.processos_administrativos(tipo);

-- =========================================================
-- 3) DOCUMENTOS DA MESA ADMINISTRATIVA
-- =========================================================
create table if not exists public.documentos_processos (
  id uuid primary key default gen_random_uuid(),
  processo_id uuid references public.processos_administrativos(id) on delete set null,
  modelo_slug text,
  tipo_documento text not null default 'Documento',
  titulo text not null,
  numero_documento text,
  ano_documento integer not null default extract(year from now())::integer,
  data_documento date not null default current_date,
  natureza text not null default 'ostensivo',
  visibilidade text not null default 'diretoria',
  status text not null default 'rascunho',
  interessado text,
  conteudo_html text,
  texto_pesquisa text,
  observacoes text,
  codigo_validacao text,
  hash_documento text,
  cadastrado_por_nome text,
  cadastrado_por_email text,
  atualizado_por_nome text,
  atualizado_por_email text,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.documentos_processos add column if not exists processo_id uuid references public.processos_administrativos(id) on delete set null;
alter table public.documentos_processos add column if not exists interessado_associado_id uuid references public.associados(id) on delete set null;
alter table public.documentos_processos add column if not exists animal_id uuid references public.animais(id) on delete set null;
alter table public.documentos_processos add column if not exists origem_sistema text;
alter table public.documentos_processos add column if not exists origem_id uuid;
alter table public.documentos_processos add column if not exists modelo_slug text;
alter table public.documentos_processos add column if not exists tipo_documento text not null default 'Documento';
alter table public.documentos_processos add column if not exists titulo text;
alter table public.documentos_processos add column if not exists numero_documento text;
alter table public.documentos_processos add column if not exists ano_documento integer not null default extract(year from now())::integer;
alter table public.documentos_processos add column if not exists data_documento date not null default current_date;
alter table public.documentos_processos add column if not exists natureza text not null default 'ostensivo';
alter table public.documentos_processos add column if not exists visibilidade text not null default 'diretoria';
alter table public.documentos_processos add column if not exists status text not null default 'rascunho';
alter table public.documentos_processos add column if not exists interessado text;
alter table public.documentos_processos add column if not exists conteudo_html text;
alter table public.documentos_processos add column if not exists texto_pesquisa text;
alter table public.documentos_processos add column if not exists observacoes text;
alter table public.documentos_processos add column if not exists codigo_validacao text;
alter table public.documentos_processos add column if not exists hash_documento text;
alter table public.documentos_processos add column if not exists cadastrado_por_nome text;
alter table public.documentos_processos add column if not exists cadastrado_por_email text;
alter table public.documentos_processos add column if not exists atualizado_por_nome text;
alter table public.documentos_processos add column if not exists atualizado_por_email text;
alter table public.documentos_processos add column if not exists updated_at timestamptz not null default now();

create index if not exists documentos_processos_processo_idx on public.documentos_processos(processo_id);
create index if not exists documentos_processos_interessado_associado_idx on public.documentos_processos(interessado_associado_id);
create index if not exists documentos_processos_animal_idx on public.documentos_processos(animal_id);
create index if not exists documentos_processos_status_idx on public.documentos_processos(status);
create index if not exists documentos_processos_validacao_idx on public.documentos_processos(codigo_validacao);

-- =========================================================
-- 4) GALERIA DE MODELOS
-- =========================================================
create table if not exists public.documentos_modelos (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  nome text not null,
  tipo text not null default 'Documento',
  descricao text,
  campos jsonb not null default '[]'::jsonb,
  conteudo_html text not null default '',
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.documentos_modelos (slug, nome, tipo, descricao, campos, conteudo_html)
values
('ata_assembleia', 'Ata de Assembleia / Reuniao', 'Ata', 'Ata ordinaria, extraordinaria, reuniao de diretoria ou conselho.', '["tipo_reuniao","data","horario","local","presidente","secretario","pautas","deliberacoes","presentes"]'::jsonb, '<h1>ATA DA [TIPO] ASSEMBLEIA GERAL DA ASSOCIACAO AMIGOS CARROCEIROS</h1><p>Digite o conteudo da ata.</p>'),
('oficio', 'Oficio', 'Oficio', 'Comunicacao formal para orgaos publicos e parceiros.', '["numero","destinatario","cargo","orgao","assunto","contexto","pedido","emissor"]'::jsonb, '<h1>OFICIO AAC No [NUMERO]/[ANO]</h1><p>Digite o conteudo do oficio.</p>'),
('resolucao', 'Resolucao Administrativa', 'Resolucao', 'Ato interno para regulamentar fundos, regras e procedimentos.', '["numero","ementa","considerandos","artigos","presidente"]'::jsonb, '<h1>RESOLUCAO ADMINISTRATIVA AAC No [NUMERO]</h1><p>Digite o conteudo da resolucao.</p>'),
('parecer_conselho', 'Parecer do Conselho Fiscal', 'Parecer', 'Parecer sobre prestacao de contas e planejamento.', '["numero","periodo","referencia","constatacoes","conclusao","conselheiros"]'::jsonb, '<h1>PARECER DO CONSELHO FISCAL</h1><p>Digite o conteudo do parecer.</p>'),
('termo_voluntario', 'Termo de Trabalho Voluntario', 'Termo', 'Termo conforme Lei Federal 9.608/1998.', '["voluntario","cpf","endereco","atividade","carga_horaria"]'::jsonb, '<h1>TERMO DE ADESAO AO TRABALHO VOLUNTARIO</h1><p>Digite o conteudo do termo.</p>'),
('documento_livre', 'Documento Livre', 'Documento Livre', 'Modelo geral para documentos nao padronizados.', '["titulo","conteudo","imagens","assinantes"]'::jsonb, '<h1>[TITULO DO DOCUMENTO]</h1><p>Digite aqui.</p>')
on conflict (slug) do update set
  nome = excluded.nome,
  tipo = excluded.tipo,
  descricao = excluded.descricao,
  campos = excluded.campos,
  updated_at = now();

-- =========================================================
-- 5) ASSINANTES E MOVIMENTACOES
-- =========================================================
create table if not exists public.documento_assinantes (
  id uuid primary key default gen_random_uuid(),
  documento_id uuid not null references public.documentos_processos(id) on delete cascade,
  associado_id uuid references public.associados(id) on delete set null,
  nome text not null,
  cargo text,
  cpf text,
  telefone_whatsapp text,
  email text,
  tipo_assinatura text not null default 'assinatura',
  obrigatorio boolean not null default true,
  ordem integer not null default 1,
  status text not null default 'pendente',
  token_acesso text unique not null default gen_random_uuid()::text,
  enviado_em timestamptz,
  assinado_em timestamptz,
  recusado_em timestamptz,
  ip_assinatura inet,
  cpf_informado text,
  hash_assinatura text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.documento_assinantes add column if not exists associado_id uuid references public.associados(id) on delete set null;

create index if not exists documento_assinantes_documento_idx on public.documento_assinantes(documento_id);
create index if not exists documento_assinantes_associado_idx on public.documento_assinantes(associado_id);
create index if not exists documento_assinantes_token_idx on public.documento_assinantes(token_acesso);
create index if not exists documento_assinantes_status_idx on public.documento_assinantes(status);

create table if not exists public.processo_movimentacoes (
  id uuid primary key default gen_random_uuid(),
  processo_id uuid not null references public.processos_administrativos(id) on delete cascade,
  tipo text not null default 'despacho',
  descricao text not null,
  destino text,
  prazo date,
  registrado_por_nome text,
  registrado_por_email text,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);

create index if not exists processo_movimentacoes_processo_idx on public.processo_movimentacoes(processo_id);

alter table public.documentos_validacoes add column if not exists documento_processo_id uuid;
alter table public.documentos_validacoes add column if not exists processo_id uuid;

-- =========================================================
-- 5.1) ASSINATURAS OFICIAIS PARA CARTEIRINHAS E DOCUMENTOS
-- =========================================================
create table if not exists public.assinaturas_institucionais (
  id uuid primary key default gen_random_uuid(),
  papel text unique not null,
  nome text,
  cargo text,
  imagem_path text,
  imagem_url text,
  ativo boolean not null default true,
  atualizado_por_nome text,
  atualizado_por_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.assinaturas_institucionais add column if not exists papel text;
alter table public.assinaturas_institucionais add column if not exists nome text;
alter table public.assinaturas_institucionais add column if not exists cargo text;
alter table public.assinaturas_institucionais add column if not exists imagem_path text;
alter table public.assinaturas_institucionais add column if not exists imagem_url text;
alter table public.assinaturas_institucionais add column if not exists ativo boolean not null default true;
alter table public.assinaturas_institucionais add column if not exists atualizado_por_nome text;
alter table public.assinaturas_institucionais add column if not exists atualizado_por_email text;
alter table public.assinaturas_institucionais add column if not exists updated_at timestamptz not null default now();

insert into public.assinaturas_institucionais (papel, cargo, ativo)
values
('presidente', 'Presidente', true),
('secretaria', 'Secretaria', true),
('bem_estar_animal', 'Bem-Estar Animal', true)
on conflict (papel) do nothing;

-- =========================================================
-- 6) RLS
-- =========================================================
alter table public.processos_administrativos enable row level security;
alter table public.documentos_processos enable row level security;
alter table public.documentos_modelos enable row level security;
alter table public.documento_assinantes enable row level security;
alter table public.processo_movimentacoes enable row level security;
alter table public.assinaturas_institucionais enable row level security;

drop policy if exists "processos_select_auth" on public.processos_administrativos;
drop policy if exists "processos_insert_auth" on public.processos_administrativos;
drop policy if exists "processos_update_auth" on public.processos_administrativos;
drop policy if exists "processos_delete_auth" on public.processos_administrativos;

create policy "processos_select_auth" on public.processos_administrativos for select using (public.get_perfil() is not null);
create policy "processos_insert_auth" on public.processos_administrativos for insert with check (public.get_perfil() in ('admin','presidencia','secretaria','tesouraria','conselho_fiscal'));
create policy "processos_update_auth" on public.processos_administrativos for update using (public.get_perfil() in ('admin','presidencia','secretaria','tesouraria','conselho_fiscal')) with check (public.get_perfil() in ('admin','presidencia','secretaria','tesouraria','conselho_fiscal'));
create policy "processos_delete_auth" on public.processos_administrativos for delete using (public.get_perfil() in ('admin','presidencia','secretaria'));

drop policy if exists "documentos_processos_select_auth" on public.documentos_processos;
drop policy if exists "documentos_processos_insert_auth" on public.documentos_processos;
drop policy if exists "documentos_processos_update_auth" on public.documentos_processos;
drop policy if exists "documentos_processos_delete_auth" on public.documentos_processos;

create policy "documentos_processos_select_auth" on public.documentos_processos for select using (public.get_perfil() is not null);
create policy "documentos_processos_insert_auth" on public.documentos_processos for insert with check (public.get_perfil() in ('admin','presidencia','secretaria','tesouraria','conselho_fiscal'));
create policy "documentos_processos_update_auth" on public.documentos_processos for update using (public.get_perfil() in ('admin','presidencia','secretaria','tesouraria','conselho_fiscal')) with check (public.get_perfil() in ('admin','presidencia','secretaria','tesouraria','conselho_fiscal'));
create policy "documentos_processos_delete_auth" on public.documentos_processos for delete using (public.get_perfil() in ('admin','presidencia','secretaria'));

drop policy if exists "documentos_modelos_select_auth" on public.documentos_modelos;
drop policy if exists "documentos_modelos_write_auth" on public.documentos_modelos;
create policy "documentos_modelos_select_auth" on public.documentos_modelos for select using (public.get_perfil() is not null);
create policy "documentos_modelos_write_auth" on public.documentos_modelos for all using (public.get_perfil() in ('admin','presidencia','secretaria')) with check (public.get_perfil() in ('admin','presidencia','secretaria'));

drop policy if exists "documento_assinantes_select_auth" on public.documento_assinantes;
drop policy if exists "documento_assinantes_insert_auth" on public.documento_assinantes;
drop policy if exists "documento_assinantes_update_auth" on public.documento_assinantes;
drop policy if exists "documento_assinantes_delete_auth" on public.documento_assinantes;

create policy "documento_assinantes_select_auth" on public.documento_assinantes for select using (public.get_perfil() is not null);
create policy "documento_assinantes_insert_auth" on public.documento_assinantes for insert with check (public.get_perfil() in ('admin','presidencia','secretaria','tesouraria','conselho_fiscal'));
create policy "documento_assinantes_update_auth" on public.documento_assinantes for update using (public.get_perfil() in ('admin','presidencia','secretaria','tesouraria','conselho_fiscal')) with check (public.get_perfil() in ('admin','presidencia','secretaria','tesouraria','conselho_fiscal'));
create policy "documento_assinantes_delete_auth" on public.documento_assinantes for delete using (public.get_perfil() in ('admin','presidencia','secretaria'));

drop policy if exists "processo_movimentacoes_select_auth" on public.processo_movimentacoes;
drop policy if exists "processo_movimentacoes_insert_auth" on public.processo_movimentacoes;
create policy "processo_movimentacoes_select_auth" on public.processo_movimentacoes for select using (public.get_perfil() is not null);
create policy "processo_movimentacoes_insert_auth" on public.processo_movimentacoes for insert with check (public.get_perfil() in ('admin','presidencia','secretaria','tesouraria','conselho_fiscal'));

drop policy if exists "assinaturas_institucionais_select_auth" on public.assinaturas_institucionais;
drop policy if exists "assinaturas_institucionais_write_auth" on public.assinaturas_institucionais;
create policy "assinaturas_institucionais_select_auth" on public.assinaturas_institucionais for select using (public.get_perfil() is not null);
create policy "assinaturas_institucionais_write_auth" on public.assinaturas_institucionais for all using (public.get_perfil() in ('admin','presidencia','secretaria')) with check (public.get_perfil() in ('admin','presidencia','secretaria'));

grant select, insert, update, delete on public.processos_administrativos to authenticated;
grant select, insert, update, delete on public.documentos_processos to authenticated;
grant select, insert, update, delete on public.documentos_modelos to authenticated;
grant select, insert, update, delete on public.documento_assinantes to authenticated;
grant select, insert on public.processo_movimentacoes to authenticated;
grant select, insert, update, delete on public.assinaturas_institucionais to authenticated;

-- =========================================================
-- 7) ASSINATURA PUBLICA POR TOKEN
-- =========================================================
create or replace function public.obter_documento_para_assinatura(p_token text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, extensions
as $$
declare
  resultado jsonb;
begin
  select jsonb_build_object(
    'documento', jsonb_build_object(
      'id', d.id,
      'tipo_documento', d.tipo_documento,
      'titulo', d.titulo,
      'numero_documento', d.numero_documento,
      'ano_documento', d.ano_documento,
      'data_documento', d.data_documento,
      'conteudo_html', d.conteudo_html,
      'codigo_validacao', d.codigo_validacao,
      'hash_documento', d.hash_documento,
      'status', d.status
    ),
    'assinante', jsonb_build_object(
      'id', a.id,
      'nome', a.nome,
      'cargo', a.cargo,
      'tipo_assinatura', a.tipo_assinatura,
      'status', a.status,
      'assinado_em', a.assinado_em
    )
  )
  into resultado
  from public.documento_assinantes a
  join public.documentos_processos d on d.id = a.documento_id
  where a.token_acesso = p_token
  limit 1;

  return resultado;
end;
$$;

create or replace function public.assinar_documento_por_token(p_token text, p_cpf text default '', p_aceite boolean default false)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  assinatura public.documento_assinantes%rowtype;
  documento public.documentos_processos%rowtype;
  novo_hash text;
begin
  if coalesce(p_aceite, false) is not true then
    return jsonb_build_object('erro', 'Aceite obrigatorio para assinar.');
  end if;

  select * into assinatura
  from public.documento_assinantes
  where token_acesso = p_token
  limit 1;

  if assinatura.id is null then
    return jsonb_build_object('erro', 'Link de assinatura nao encontrado.');
  end if;

  if assinatura.status = 'assinado' then
    return jsonb_build_object('ok', true, 'status', 'assinado');
  end if;

  if coalesce(assinatura.cpf, '') <> '' and regexp_replace(coalesce(assinatura.cpf, ''), '\D', '', 'g') <> regexp_replace(coalesce(p_cpf, ''), '\D', '', 'g') then
    return jsonb_build_object('erro', 'CPF informado nao confere com o assinante previsto.');
  end if;

  select * into documento
  from public.documentos_processos
  where id = assinatura.documento_id;

  novo_hash := encode(extensions.digest(convert_to(coalesce(documento.hash_documento, '') || assinatura.id::text || now()::text, 'UTF8'), 'sha256'), 'hex');

  update public.documento_assinantes
  set
    status = 'assinado',
    assinado_em = now(),
    cpf_informado = p_cpf,
    ip_assinatura = inet_client_addr(),
    hash_assinatura = novo_hash,
    updated_at = now()
  where id = assinatura.id;

  update public.documentos_processos
  set
    status = case
      when not exists (
        select 1 from public.documento_assinantes
        where documento_id = documento.id
        and obrigatorio = true
        and status <> 'assinado'
      ) then 'assinado'
      else status
    end,
    updated_at = now()
  where id = documento.id;

  return jsonb_build_object('ok', true, 'status', 'assinado', 'hash_assinatura', novo_hash);
end;
$$;

grant execute on function public.obter_documento_para_assinatura(text) to anon, authenticated;
grant execute on function public.assinar_documento_por_token(text, text, boolean) to anon, authenticated;

notify pgrst, 'reload schema';
