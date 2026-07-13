import { supabase } from './supabase';

function limparCodigoBase(valor = '') {
  return String(valor || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toUpperCase();
}

export function gerarCodigoValidacao(prefixo = 'DOC', referencia = '') {
  const ano = new Date().getFullYear();
  const base = limparCodigoBase(referencia).slice(0, 22) || crypto.randomUUID().slice(0, 8).toUpperCase();
  const sufixo = crypto.randomUUID().slice(0, 8).toUpperCase();
  return `AAC-${prefixo}-${base}-${ano}-${sufixo}`;
}

export function urlValidacaoDocumento(codigo) {
  const origem = typeof window !== 'undefined' && window.location?.origin
    ? window.location.origin
    : 'https://painel.amigoscarroceiros.org.br';
  return `${origem}/validar/${encodeURIComponent(codigo)}`;
}

export async function registrarValidacaoDocumento({
  tipo_documento = 'Documento',
  titulo = '',
  codigo_referencia = '',
  associado_id = null,
  animal_id = null,
  ata_id = null,
  mensalidade_id = null,
  emitido_por_nome = '',
  emitido_por_email = '',
  dados_publicos = {}
} = {}) {
  const codigo_validacao = gerarCodigoValidacao(tipoParaPrefixo(tipo_documento), codigo_referencia || titulo);
  const payload = {
    codigo_validacao,
    tipo_documento,
    titulo: titulo || tipo_documento,
    codigo_referencia: codigo_referencia || null,
    associado_id,
    animal_id,
    ata_id,
    mensalidade_id,
    emitido_por_nome,
    emitido_por_email,
    dados_publicos,
    status: 'valido'
  };

  const { data, error } = await supabase
    .from('documentos_validacoes')
    .insert(payload)
    .select('*')
    .single();

  if (error) {
    console.warn('Não foi possível registrar validação pública:', error.message);
    return { data: null, error };
  }

  return { data: { ...data, url_validacao: urlValidacaoDocumento(data.codigo_validacao) }, error: null };
}

function tipoParaPrefixo(tipo = '') {
  const t = String(tipo).toLowerCase();
  if (t.includes('recibo')) return 'REC';
  if (t.includes('ata')) return 'ATA';
  if (t.includes('certid')) return 'CERT';
  if (t.includes('rga')) return 'RGA';
  if (t.includes('ficha')) return 'FICHA';
  return 'DOC';
}
