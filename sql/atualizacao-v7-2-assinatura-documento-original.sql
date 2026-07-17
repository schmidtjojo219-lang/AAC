-- AAC Painel Interno v7.2
-- Correcoes da Mesa de Assinaturas:
-- 1) assina o documento original gerado pelo sistema;
-- 2) arquiva automaticamente quando todos os obrigatorios assinarem;
-- 3) vincula ficha/RGA assinados ao associado ou animal;
-- 4) cria validacao publica com hash SHA-256.
-- Execute depois de sql/atualizacao-v7-1-documentos-profissionais.sql.

create extension if not exists "pgcrypto";

alter table public.documentos_processos add column if not exists documento_original_html text;
alter table public.documentos_processos add column if not exists documento_assinado_html text;
alter table public.documentos_processos add column if not exists documento_original_hash text;
alter table public.documentos_processos add column if not exists documento_final_hash text;
alter table public.documentos_processos add column if not exists arquivo_original_path text;
alter table public.documentos_processos add column if not exists arquivo_assinado_path text;
alter table public.documentos_processos add column if not exists arquivado_em timestamptz;
alter table public.documentos_processos add column if not exists interessado_associado_id uuid references public.associados(id) on delete set null;
alter table public.documentos_processos add column if not exists animal_id uuid references public.animais(id) on delete set null;
alter table public.documentos_processos add column if not exists origem_sistema text;
alter table public.documentos_processos add column if not exists origem_id uuid;

alter table public.associados add column if not exists ficha_assinada_documento_id uuid references public.documentos_processos(id) on delete set null;
alter table public.associados add column if not exists ficha_assinada_em timestamptz;

alter table public.animais add column if not exists ficha_rga_assinada_documento_id uuid references public.documentos_processos(id) on delete set null;
alter table public.animais add column if not exists ficha_rga_assinada_em timestamptz;

create index if not exists documentos_processos_origem_idx on public.documentos_processos(origem_sistema, origem_id);
create index if not exists documentos_processos_arquivado_idx on public.documentos_processos(arquivado_em desc);

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
      'documento_original_html', coalesce(d.documento_original_html, d.conteudo_html),
      'documento_assinado_html', d.documento_assinado_html,
      'codigo_validacao', d.codigo_validacao,
      'hash_documento', d.hash_documento,
      'documento_original_hash', d.documento_original_hash,
      'documento_final_hash', d.documento_final_hash,
      'status', d.status
    ),
    'assinante', jsonb_build_object(
      'id', a.id,
      'nome', a.nome,
      'cargo', a.cargo,
      'tipo_assinatura', a.tipo_assinatura,
      'status', a.status,
      'assinado_em', a.assinado_em,
      'hash_assinatura', a.hash_assinatura
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
  hash_final text;
  codigo_final text;
  todos_assinados boolean;
  assinantes_json jsonb;
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

  if documento.status in ('arquivado', 'cancelado') then
    return jsonb_build_object('erro', 'Documento ja esta arquivado ou cancelado.');
  end if;

  novo_hash := encode(
    extensions.digest(
      convert_to(coalesce(documento.documento_original_hash, documento.hash_documento, '') || assinatura.id::text || now()::text, 'UTF8'),
      'sha256'
    ),
    'hex'
  );

  update public.documento_assinantes
  set
    status = 'assinado',
    assinado_em = now(),
    cpf_informado = p_cpf,
    ip_assinatura = inet_client_addr(),
    hash_assinatura = novo_hash,
    updated_at = now()
  where id = assinatura.id;

  select not exists (
    select 1
    from public.documento_assinantes
    where documento_id = documento.id
    and obrigatorio = true
    and status <> 'assinado'
  )
  into todos_assinados;

  if todos_assinados then
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'nome', nome,
          'cargo', cargo,
          'cpf', cpf,
          'assinado_em', assinado_em,
          'hash_assinatura', hash_assinatura,
          'ordem', ordem
        )
        order by ordem
      ),
      '[]'::jsonb
    )
    into assinantes_json
    from public.documento_assinantes
    where documento_id = documento.id;

    codigo_final := coalesce(
      documento.codigo_validacao,
      'AAC-DOC-' || extract(year from now())::text || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10))
    );

    hash_final := encode(
      extensions.digest(
        convert_to(
          coalesce(documento.documento_original_html, documento.conteudo_html, '') || codigo_final || assinantes_json::text,
          'UTF8'
        ),
        'sha256'
      ),
      'hex'
    );

    update public.documentos_processos
    set
      status = 'arquivado',
      codigo_validacao = codigo_final,
      hash_documento = hash_final,
      documento_final_hash = hash_final,
      documento_assinado_html = coalesce(documento.documento_original_html, documento.conteudo_html),
      arquivado_em = now(),
      updated_at = now()
    where id = documento.id;

    insert into public.documentos_validacoes (
      codigo_validacao,
      tipo_documento,
      titulo,
      codigo_referencia,
      associado_id,
      animal_id,
      emitido_por_nome,
      emitido_por_email,
      emitido_em,
      dados_publicos,
      status,
      documento_processo_id,
      processo_id
    )
    values (
      codigo_final,
      documento.tipo_documento,
      documento.titulo,
      coalesce(documento.numero_documento, documento.titulo),
      documento.interessado_associado_id,
      documento.animal_id,
      coalesce(documento.cadastrado_por_nome, documento.atualizado_por_nome, 'Associação Amigos Carroceiros - AAC'),
      coalesce(documento.cadastrado_por_email, documento.atualizado_por_email, ''),
      now(),
      jsonb_build_object(
        'titulo', documento.titulo,
        'tipo', documento.tipo_documento,
        'status', 'arquivado',
        'hash_sha256', hash_final,
        'origem_sistema', documento.origem_sistema,
        'interessado', documento.interessado
      ),
      'valido',
      documento.id,
      documento.processo_id
    )
    on conflict (codigo_validacao) do update set
      tipo_documento = excluded.tipo_documento,
      titulo = excluded.titulo,
      dados_publicos = excluded.dados_publicos,
      status = 'valido';

    if documento.origem_sistema = 'associado_ficha' and documento.interessado_associado_id is not null then
      update public.associados
      set ficha_assinada_documento_id = documento.id,
          ficha_assinada_em = now(),
          updated_at = now()
      where id = documento.interessado_associado_id;
    end if;

    if documento.origem_sistema = 'animal_rga' and documento.animal_id is not null then
      update public.animais
      set ficha_rga_assinada_documento_id = documento.id,
          ficha_rga_assinada_em = now(),
          updated_at = now()
      where id = documento.animal_id;
    end if;
  else
    update public.documentos_processos
    set status = 'em_assinatura',
        updated_at = now()
    where id = documento.id;
  end if;

  return jsonb_build_object(
    'ok', true,
    'status', case when todos_assinados then 'arquivado' else 'assinado' end,
    'hash_assinatura', novo_hash,
    'codigo_validacao', codigo_final
  );
end;
$$;

grant execute on function public.obter_documento_para_assinatura(text) to anon, authenticated;
grant execute on function public.assinar_documento_por_token(text, text, boolean) to anon, authenticated;

notify pgrst, 'reload schema';
