import { useEffect, useMemo, useRef, useState } from 'react';
import {
  BadgeCheck,
  BookOpen,
  ClipboardList,
  Copy,
  Edit3,
  FileCog,
  FileCheck2,
  FileDown,
  FileSignature,
  FileText,
  FolderKanban,
  Hash,
  Link2,
  MessageCircle,
  Plus,
  RefreshCw,
  Save,
  Search,
  Send,
  Settings,
  Trash2,
  Upload,
  UserPlus,
  X
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { canEdit } from '../lib/permissions';
import { cpfMask, dateBR, dateTimeBR, phoneMask } from '../lib/format';
import { gerarQrCodeDataUrl } from '../lib/qrcode';
import { registrarValidacaoDocumento, urlValidacaoDocumento } from '../lib/validacao';
import { BUCKET_PUBLICO, uploadArquivo } from '../lib/storage';
import { escapeHtml } from '../lib/printDocs';
import PageShell from '../components/PageShell';
import EmptyState from '../components/EmptyState';

const hoje = () => new Date().toISOString().slice(0, 10);
const anoAtual = () => new Date().getFullYear();

const modelosBase = [
  {
    slug: 'ata_assembleia',
    nome: 'Ata de Assembleia / Reuniao',
    tipo: 'Ata',
    descricao: 'Ata ordinaria, extraordinaria, reuniao de diretoria ou conselho.',
    campos: ['tipo_reuniao', 'data', 'horario', 'local', 'presidente', 'secretario', 'pautas', 'deliberacoes', 'presentes'],
    conteudo: `<h1>ATA DA [TIPO] ASSEMBLEIA GERAL DA ASSOCIACAO AMIGOS CARROCEIROS</h1>
<p>Aos [DIA] dias do mes de [MES] do ano de [ANO], as [HORARIO] horas, reuniram-se os membros da Diretoria Executiva, Conselho Fiscal e demais associados da Associacao Amigos Carroceiros (AAC), no endereco [LOCAL], sob a presidencia de [PRESIDENTE] e secretariado por [SECRETARIO].</p>
<p><strong>Ordem do Dia:</strong> [PAUTAS]</p>
<p>Iniciados os trabalhos, foram debatidos os pontos da pauta e restou deliberado que: [DELIBERACOES]</p>
<p>Nada mais havendo a tratar, a reuniao foi encerrada. Eu, [SECRETARIO], lavrei a presente ata que, lida e achada conforme, vai assinada pelos presentes.</p>
<p>Sao Francisco do Sul - SC, [DIA] de [MES] de [ANO].</p>`
  },
  {
    slug: 'oficio',
    nome: 'Oficio',
    tipo: 'Oficio',
    descricao: 'Comunicacao formal para prefeitura, orgaos publicos e parceiros.',
    campos: ['numero', 'destinatario', 'cargo', 'orgao', 'assunto', 'contexto', 'pedido', 'emissor'],
    conteudo: `<h1>OFICIO AAC No [NUMERO]/[ANO]</h1>
<p>Sao Francisco do Sul - SC, [DIA] de [MES] de [ANO].</p>
<p>Ao(a) Senhor(a)<br>[DESTINATARIO]<br>[CARGO]<br>[ORGAO]</p>
<p><strong>Assunto:</strong> [ASSUNTO]</p>
<p>Prezado(a) Senhor(a),</p>
<p>Ao cumprimenta-lo(a) cordialmente, vimos por meio deste, em nome da Associacao Amigos Carroceiros (AAC), expor e solicitar o que segue.</p>
<p>[CONTEXTO]</p>
<p>Diante do exposto, solicitamos [PEDIDO].</p>
<p>Atenciosamente,</p>
<p>[EMISSOR]<br>Associacao Amigos Carroceiros (AAC)</p>`
  },
  {
    slug: 'resolucao',
    nome: 'Resolucao Administrativa',
    tipo: 'Resolucao',
    descricao: 'Ato interno para regulamentar fundos, regras e procedimentos.',
    campos: ['numero', 'ementa', 'considerandos', 'artigos', 'presidente'],
    conteudo: `<h1>RESOLUCAO ADMINISTRATIVA AAC No [NUMERO], DE [DIA] DE [MES] DE [ANO]</h1>
<p><strong>Ementa:</strong> [EMENTA]</p>
<p>A Diretoria Executiva da Associacao Amigos Carroceiros (AAC), no uso das atribuicoes estatutarias, considerando [CONSIDERANDOS], resolve:</p>
<p><strong>Art. 1o</strong> - [ARTIGO_1]</p>
<p><strong>Art. 2o</strong> - [ARTIGO_2]</p>
<p><strong>Art. 3o</strong> - Esta Resolucao entra em vigor na data de sua publicacao no painel oficial da associacao.</p>
<p>Registre-se, publique-se e cumpra-se.</p>
<p>Sao Francisco do Sul - SC, [DIA] de [MES] de [ANO].</p>`
  },
  {
    slug: 'parecer_conselho',
    nome: 'Parecer do Conselho Fiscal',
    tipo: 'Parecer',
    descricao: 'Parecer sobre balancete, prestacao de contas e planejamento.',
    campos: ['numero', 'periodo', 'referencia', 'constatacoes', 'conclusao', 'conselheiros'],
    conteudo: `<h1>PARECER DO CONSELHO FISCAL - AAC No [NUMERO]/[ANO]</h1>
<p><strong>Referencia:</strong> Analise referente ao periodo de [PERIODO].</p>
<p>O Conselho Fiscal da Associacao Amigos Carroceiros (AAC), no cumprimento de suas funcoes estatutarias, reuniu-se para examinar a prestacao de contas, extratos, comprovantes de receitas e despesas e a divisao percentual dos fundos internos.</p>
<p>Constatou-se que: [CONSTATACOES]</p>
<p>Diante do exposto, o Conselho Fiscal emite parecer [CONCLUSAO] a aprovacao das contas apresentadas.</p>
<p>Sao Francisco do Sul - SC, [DIA] de [MES] de [ANO].</p>`
  },
  {
    slug: 'termo_voluntario',
    nome: 'Termo de Trabalho Voluntario',
    tipo: 'Termo',
    descricao: 'Termo conforme Lei Federal 9.608/1998.',
    campos: ['voluntario', 'cpf', 'endereco', 'atividade', 'carga_horaria'],
    conteudo: `<h1>TERMO DE ADESAO AO TRABALHO VOLUNTARIO</h1>
<p>Pelo presente instrumento, a ASSOCIACAO AMIGOS CARROCEIROS (AAC), pessoa juridica de direito privado, sem fins lucrativos, e [VOLUNTARIO], CPF [CPF], celebram o presente Termo de Adesao ao Servico Voluntario, com fundamento na Lei Federal no 9.608/1998.</p>
<p><strong>Clausula Primeira - Do Objeto:</strong> O(A) voluntario(a) prestara servicos de natureza nao remunerada, auxiliando nas atividades de [ATIVIDADE].</p>
<p><strong>Clausula Segunda - Da Natureza:</strong> A atividade voluntaria nao gera vinculo empregaticio, obrigacao trabalhista, previdenciaria ou afim.</p>
<p><strong>Clausula Terceira - Da Execucao:</strong> As atividades serao exercidas conforme disponibilidade, estimando-se [CARGA_HORARIA].</p>
<p>E, por estarem justos e acordados, assinam o presente instrumento.</p>`
  },
  {
    slug: 'documento_livre',
    nome: 'Documento Livre',
    tipo: 'Documento Livre',
    descricao: 'Modelo geral para documentos que nao se encaixam nos modelos oficiais.',
    campos: ['titulo', 'conteudo', 'imagens', 'assinantes'],
    conteudo: `<h1>[TITULO DO DOCUMENTO]</h1>
<p>Digite aqui o conteudo do documento. Use os botoes do editor para formatar titulos, listas, alinhamento e inserir imagens por URL.</p>`
  }
];

const documentoInicial = {
  id: null,
  processo_id: '',
  modelo_slug: 'oficio',
  tipo_documento: 'Oficio',
  titulo: '',
  numero_documento: '',
  ano_documento: anoAtual(),
  data_documento: hoje(),
  natureza: 'ostensivo',
  visibilidade: 'diretoria',
  status: 'rascunho',
  interessado: '',
  conteudo_html: modelosBase[1].conteudo,
  observacoes: '',
  codigo_validacao: '',
  hash_documento: ''
};

const processoInicial = {
  id: null,
  numero_processo: '',
  titulo: '',
  tipo: 'Administrativo',
  status: 'aberto',
  interessado: '',
  prioridade: 'normal',
  data_abertura: hoje(),
  descricao: ''
};

const assinanteInicial = {
  associado_id: '',
  nome: '',
  cargo: '',
  cpf: '',
  telefone_whatsapp: '',
  email: '',
  tipo_assinatura: 'assinatura',
  ordem: 1,
  obrigatorio: true
};

const assinaturaOficialInicial = {
  papel: 'presidente',
  nome: '',
  cargo: 'Presidente',
  imagem_url: '',
  ativo: true
};

const movimentacaoInicial = {
  tipo: 'despacho',
  descricao: '',
  destino: '',
  prazo: ''
};

function normalizarTelefone(valor = '') {
  const digitos = String(valor || '').replace(/\D/g, '');
  if (!digitos) return '';
  if (digitos.startsWith('55')) return digitos;
  return `55${digitos}`;
}

function erroSupabase(error) {
  return [error?.message, error?.details, error?.hint, error?.code].filter(Boolean).join('\n') || 'Erro desconhecido.';
}

async function sha256(texto = '') {
  const bytes = new TextEncoder().encode(texto);
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function stripHtml(html = '') {
  const div = document.createElement('div');
  div.innerHTML = html;
  return div.textContent || div.innerText || '';
}

function assinaturaDocumentoHtml(assinante, doc, qr = '') {
  const hash = assinante.hash_assinatura || doc.hash_documento || doc.documento_final_hash || doc.documento_original_hash || 'pendente';
  const validacao = doc.codigo_validacao || 'pendente';
  const data = assinante.assinado_em ? dateTimeBR(assinante.assinado_em) : 'pendente';
  const nome = assinante.nome || 'Assinante';
  const cargo = assinante.cargo || assinante.tipo_assinatura || '';
  return `<div class="assinatura-digital-bloco">
    ${qr ? `<img class="assinatura-digital-qr" src="${qr}" alt="QR Code de validação">` : ''}
    <div>
      <strong>Documento assinado eletronicamente no Sistema AAC</strong><br>
      por <strong>${escapeHtml(nome)}</strong>${cargo ? `, ${escapeHtml(cargo)}` : ''}, em ${escapeHtml(data)}.<br>
      Validação por QR Code e hash SHA-256, sem certificação ICP-Brasil.<br>
      <strong>Hash:</strong> <span class="quebra">${escapeHtml(hash)}</span><br>
      <strong>Código de validação:</strong> ${escapeHtml(validacao)}
    </div>
  </div>`;
}

function estilosDocumentoFinal() {
  return `<style>
    *{box-sizing:border-box}
    html,body{margin:0;padding:0}
    body{font-family:Arial,Helvetica,sans-serif;background:#e5e7eb;color:#111827;line-height:1.35;-webkit-print-color-adjust:exact;print-color-adjust:exact}
    .print-actions{position:fixed;right:16px;top:16px;z-index:999;display:flex;gap:8px}
    .print-actions button{border:0;border-radius:12px;background:#163f2a;color:white;padding:10px 14px;font-weight:800;cursor:pointer}
    .page{width:194mm;min-height:281mm;margin:8mm auto;background:white;padding:0;box-shadow:0 8px 30px #0002;break-after:page;page-break-after:always;overflow:hidden}
    .page:last-child{break-after:auto;page-break-after:auto}
    .page-inner{padding:8mm}
    .aac-doc-header{display:grid;grid-template-columns:22mm 1fr 24mm;gap:8px;align-items:center;border-bottom:2px solid #111;padding-bottom:6px;margin-bottom:7mm}
    .aac-doc-header img.logo{width:18mm;height:18mm;object-fit:contain}
    .aac-doc-header img.qr-topo{width:22mm;height:22mm;object-fit:contain;margin-left:auto}
    .aac-doc-header h1{margin:0;font-size:16pt;line-height:1.05;text-transform:uppercase;color:#374151}
    .aac-doc-header p{margin:2px 0 0;font-size:10pt;color:#374151}
    .doc-title{text-align:center;font-size:14pt;font-weight:900;text-decoration:underline;margin:5mm 0 3mm;color:#374151}
    .section-title{border:1px solid #111;padding:3px 6px;font-weight:900;text-transform:uppercase;margin:5mm 0 2mm;background:#f8fafc}
    .conteudo-oficial{font-size:11pt;text-align:justify}
    .conteudo-oficial h1,.conteudo-oficial h2,.conteudo-oficial h3{text-align:center;text-decoration:underline;color:#374151}
    .controle-documento{margin-top:8mm;border:1px dashed #9ca3af;padding:4mm;font-size:9pt;background:#f9fafb}
    .assinaturas-digitais{display:grid;grid-template-columns:1fr 1fr;gap:6mm;margin-top:10mm}
    .assinatura-digital-bloco{display:grid;grid-template-columns:24mm 1fr;gap:3mm;align-items:center;border-top:1px solid #111;padding-top:3mm;font-size:8.8pt;line-height:1.2;break-inside:avoid;page-break-inside:avoid}
    .assinatura-digital-qr{width:22mm;height:22mm;object-fit:contain}
    .assinatura-digital-bloco .quebra{word-break:break-all}
    .signature.assinada{font-size:8.5pt;line-height:1.15}
    .signature.assinada .hash{font-size:7pt;word-break:break-all}
    @page{size:A4;margin:8mm}
    @media print{body{background:#fff}.page{width:auto;min-height:auto;margin:0;box-shadow:none;overflow:visible}.page-inner{padding:0}.print-actions{display:none}}
  </style>`;
}

function preencherCamposAssinatura(html = '', assinantes = [], doc = {}, qr = '') {
  let indice = 0;
  const blocosExtras = [];
  const preenchido = String(html || '').replace(/<div class="signature">([\s\S]*?)<\/div>/g, (match) => {
    const assinante = assinantes[indice];
    indice += 1;
    if (!assinante) return match;
    const hash = assinante.hash_assinatura || doc.hash_documento || 'pendente';
    return `<div class="signature assinada">
      <strong>${escapeHtml(assinante.nome || 'Assinante')}</strong><br>
      ${escapeHtml(assinante.cargo || assinante.tipo_assinatura || '')}<br>
      ${assinante.assinado_em ? escapeHtml(dateTimeBR(assinante.assinado_em)) : 'Assinatura pendente'}
      <div class="hash">SHA-256: ${escapeHtml(hash)}</div>
    </div>`;
  });
  for (let i = indice; i < assinantes.length; i += 1) {
    blocosExtras.push(assinaturaDocumentoHtml(assinantes[i], doc, qr));
  }
  if (!blocosExtras.length) return preenchido;
  return `${preenchido}<main class="page"><div class="page-inner"><div class="doc-title">ASSINATURAS ELETRÔNICAS</div><div class="assinaturas-digitais">${blocosExtras.join('')}</div></div></main>`;
}

function montarDocumentoOficialHtml(doc, assinantes = [], qr = '') {
  const codigo = doc.codigo_validacao || 'pendente';
  const hash = doc.documento_final_hash || doc.hash_documento || doc.documento_original_hash || 'pendente';
  const base = doc.documento_assinado_html || doc.documento_original_html || doc.conteudo_html || '';
  if (base.includes('class="page"') || base.includes("class='page'")) {
    const corpo = preencherCamposAssinatura(base, assinantes, doc, qr);
    return `${estilosDocumentoFinal()}${corpo}<main class="page"><div class="page-inner"><div class="section-title">Controle final do documento</div><div class="controle-documento"><strong>Código de validação:</strong> ${escapeHtml(codigo)}<br><strong>Hash SHA-256 final:</strong> <span style="word-break:break-all">${escapeHtml(hash)}</span></div><div class="assinaturas-digitais">${assinantes.map(a => assinaturaDocumentoHtml(a, doc, qr)).join('')}</div></div></main>`;
  }
  return `${estilosDocumentoFinal()}<main class="page"><div class="page-inner">
    <div class="aac-doc-header">
      <img class="logo" src="/logo.png" alt="Logo AAC">
      <div><h1>Associação Amigos Carroceiros (AAC)</h1><p>CNPJ: 67.138.262/0001-98<br>Sede Provisória: Rua Palma Sola, nº 383, Bairro Ubatuba, São Francisco do Sul/SC</p></div>
      ${qr ? `<img class="qr-topo" src="${qr}" alt="QR Code">` : '<span></span>'}
    </div>
    <div class="doc-title">${escapeHtml(doc.titulo || doc.tipo_documento || 'Documento AAC')}</div>
    <div class="section-title">Conteúdo</div>
    <article class="conteudo-oficial">${base}</article>
    <div class="controle-documento"><strong>Controle interno do documento</strong><br>Emitido por: ${escapeHtml(doc.cadastrado_por_nome || doc.atualizado_por_nome || '-')}<br>Data do documento: ${escapeHtml(dateBR(doc.data_documento))}<br>Código de validação: ${escapeHtml(codigo)}<br>Hash SHA-256: <span style="word-break:break-all">${escapeHtml(hash)}</span></div>
    <div class="assinaturas-digitais">${assinantes.map(a => assinaturaDocumentoHtml(a, doc, qr)).join('')}</div>
  </div></main>`;
}

function formatarCampos(campos = []) {
  return campos.length ? campos.join(', ') : 'Campos livres';
}

function statusLabel(status = '') {
  const labels = {
    rascunho: 'Rascunho',
    em_assinatura: 'Em assinatura',
    assinado: 'Assinado',
    publicado: 'Publicado',
    arquivado: 'Arquivado',
    cancelado: 'Cancelado',
    aberto: 'Aberto',
    em_analise: 'Em analise',
    encerrado: 'Encerrado'
  };
  return labels[status] || status || '-';
}

export default function DocumentosProcessos({ profile }) {
  const [aba, setAba] = useState('documentos');
  const [documentos, setDocumentos] = useState([]);
  const [processos, setProcessos] = useState([]);
  const [associados, setAssociados] = useState([]);
  const [assinantes, setAssinantes] = useState([]);
  const [movimentacoes, setMovimentacoes] = useState([]);
  const [assinaturasOficiais, setAssinaturasOficiais] = useState([]);
  const [docForm, setDocForm] = useState(documentoInicial);
  const [processoForm, setProcessoForm] = useState(processoInicial);
  const [assinanteForm, setAssinanteForm] = useState(assinanteInicial);
  const [assinaturaForm, setAssinaturaForm] = useState(assinaturaOficialInicial);
  const [arquivoAssinatura, setArquivoAssinatura] = useState(null);
  const [movForm, setMovForm] = useState(movimentacaoInicial);
  const [busca, setBusca] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const editorRef = useRef(null);
  const podeEditar = canEdit(profile, 'documentos') || canEdit(profile, 'atas');
  const editandoDoc = Boolean(docForm.id);
  const editandoProcesso = Boolean(processoForm.id);

  useEffect(() => { carregar(); }, []);
  useEffect(() => { if (docForm.id) carregarAssinantes(docForm.id); else setAssinantes([]); }, [docForm.id]);
  useEffect(() => { if (processoForm.id) carregarMovimentacoes(processoForm.id); else setMovimentacoes([]); }, [processoForm.id]);
  useEffect(() => {
    if (editorRef.current) editorRef.current.innerHTML = docForm.conteudo_html || '';
  }, [docForm.id, docForm.modelo_slug]);

  async function carregar() {
    setLoading(true);
    setMsg('');
    const [docsResp, processosResp, associadosResp, assinaturasResp] = await Promise.all([
      supabase.from('documentos_processos').select('*, processos_administrativos(numero_processo, titulo)').order('created_at', { ascending: false }),
      supabase.from('processos_administrativos').select('*').order('created_at', { ascending: false }),
      supabase.from('associados').select('id, nome_completo, cpf, telefone_whatsapp, email, tipo_cadastro, status').order('nome_completo'),
      supabase.from('assinaturas_institucionais').select('*').order('papel')
    ]);
    const erros = [docsResp.error, processosResp.error, associadosResp.error, assinaturasResp.error].filter(Boolean);
    if (erros.length) setMsg('Execute no Supabase o arquivo sql/atualizacao-v7-1-documentos-profissionais.sql.\n' + erros.map(erroSupabase).join('\n---\n'));
    setDocumentos(docsResp.data || []);
    setProcessos(processosResp.data || []);
    setAssociados(associadosResp.data || []);
    setAssinaturasOficiais(assinaturasResp.data || []);
    setLoading(false);
  }

  async function carregarAssinantes(documentoId) {
    const { data, error } = await supabase
      .from('documento_assinantes')
      .select('*')
      .eq('documento_id', documentoId)
      .order('ordem', { ascending: true });
    if (!error) setAssinantes(data || []);
  }

  async function carregarMovimentacoes(processoId) {
    const { data, error } = await supabase
      .from('processo_movimentacoes')
      .select('*')
      .eq('processo_id', processoId)
      .order('created_at', { ascending: false });
    if (!error) setMovimentacoes(data || []);
  }

  const modelos = modelosBase;
  const modeloAtual = useMemo(() => modelos.find(m => m.slug === docForm.modelo_slug) || modelos[0], [modelos, docForm.modelo_slug]);

  const docsFiltrados = useMemo(() => {
    const q = busca.toLowerCase().trim();
    if (!q) return documentos;
    return documentos.filter(d => [d.titulo, d.tipo_documento, d.numero_documento, d.status, d.interessado, d.codigo_validacao].join(' ').toLowerCase().includes(q));
  }, [documentos, busca]);

  const processosFiltrados = useMemo(() => {
    const q = busca.toLowerCase().trim();
    if (!q) return processos;
    return processos.filter(p => [p.numero_processo, p.titulo, p.tipo, p.status, p.interessado].join(' ').toLowerCase().includes(q));
  }, [processos, busca]);

  function aplicarModelo(slug) {
    const modelo = modelos.find(m => m.slug === slug) || modelos[0];
    setDocForm({
      ...docForm,
      modelo_slug: modelo.slug,
      tipo_documento: modelo.tipo,
      conteudo_html: modelo.conteudo,
      titulo: docForm.titulo || modelo.nome
    });
    if (editorRef.current) editorRef.current.innerHTML = modelo.conteudo;
  }

  function limparDoc() {
    setDocForm(documentoInicial);
    setAssinantes([]);
    setMsg('');
  }

  function limparProcesso() {
    setProcessoForm(processoInicial);
    setMovimentacoes([]);
    setMsg('');
  }

  function comandoEditor(comando, valor = null) {
    document.execCommand(comando, false, valor);
    editorRef.current?.focus();
  }

  function conteudoEditorAtual() {
    return editorRef.current?.innerHTML || docForm.conteudo_html || '';
  }

  function selecionarInteressadoAssociado(id) {
    const associado = associados.find(a => a.id === id);
    if (!associado) return setDocForm({ ...docForm, interessado: '', interessado_associado_id: '' });
    setDocForm({
      ...docForm,
      interessado_associado_id: associado.id,
      interessado: associado.nome_completo || ''
    });
  }

  function selecionarAssinanteAssociado(id) {
    const associado = associados.find(a => a.id === id);
    if (!associado) return setAssinanteForm({ ...assinanteForm, associado_id: '', nome: '', cpf: '', telefone_whatsapp: '', email: '' });
    setAssinanteForm({
      ...assinanteForm,
      associado_id: associado.id,
      nome: associado.nome_completo || '',
      cpf: cpfMask(associado.cpf || ''),
      telefone_whatsapp: phoneMask(associado.telefone_whatsapp || ''),
      email: associado.email || '',
      cargo: assinanteForm.cargo || associado.tipo_cadastro || ''
    });
  }

  async function salvarDocumento(e) {
    e.preventDefault();
    if (!podeEditar) return;
    if (editandoDoc && ['assinado', 'arquivado'].includes(String(docForm.status || '').toLowerCase())) {
      alert('Documento já assinado/arquivado. Ele fica travado para preservar o hash e a validade.');
      return;
    }
    setLoading(true);
    try {
      const conteudo_html = conteudoEditorAtual();
      const hash_documento = await sha256(`${docForm.titulo}|${docForm.numero_documento}|${docForm.ano_documento}|${conteudo_html}`);
      let codigo_validacao = docForm.codigo_validacao || '';

      if (!codigo_validacao && ['em_assinatura', 'assinado', 'publicado'].includes(docForm.status)) {
        const validacao = await registrarValidacaoDocumento({
          tipo_documento: docForm.tipo_documento,
          titulo: docForm.titulo,
          codigo_referencia: docForm.numero_documento || docForm.titulo,
          emitido_por_nome: profile?.nome || profile?.email || '',
          emitido_por_email: profile?.email || '',
          dados_publicos: {
            titulo: docForm.titulo,
            tipo: docForm.tipo_documento,
            status: docForm.status,
            hash: hash_documento
          }
        });
        codigo_validacao = validacao.data?.codigo_validacao || '';
      }

      const editando = Boolean(docForm.id);
      const payload = {
        ...docForm,
        conteudo_html,
        processo_id: docForm.processo_id || null,
        ano_documento: Number(docForm.ano_documento || anoAtual()),
        codigo_validacao: codigo_validacao || null,
        hash_documento,
        documento_original_html: docForm.documento_original_html || conteudo_html,
        documento_original_hash: docForm.documento_original_hash || hash_documento,
        texto_pesquisa: stripHtml(conteudo_html),
        atualizado_por_nome: profile?.nome || profile?.email || '',
        atualizado_por_email: profile?.email || '',
        updated_at: new Date().toISOString()
      };
      if (!editando) {
        payload.cadastrado_por_nome = profile?.nome || profile?.email || '';
        payload.cadastrado_por_email = profile?.email || '';
      }
      delete payload.id;
      delete payload.created_at;
      const { data, error } = editando
        ? await supabase.from('documentos_processos').update(payload).eq('id', docForm.id).select('*').single()
        : await supabase.from('documentos_processos').insert(payload).select('*').single();
      if (error) throw error;
      setDocForm({ ...documentoInicial, ...data, processo_id: data.processo_id || '' });
      setMsg(editando ? 'Documento atualizado.' : 'Documento criado. Agora voce pode adicionar assinantes.');
      await carregar();
      setAba('assinaturas');
    } catch (error) {
      alert('Erro ao salvar documento:\n' + erroSupabase(error));
    } finally {
      setLoading(false);
    }
  }

  async function salvarProcesso(e) {
    e.preventDefault();
    if (!podeEditar) return;
    setLoading(true);
    try {
      const editando = Boolean(processoForm.id);
      const payload = {
        ...processoForm,
        atualizado_por_nome: profile?.nome || profile?.email || '',
        atualizado_por_email: profile?.email || '',
        updated_at: new Date().toISOString()
      };
      if (!editando) {
        payload.cadastrado_por_nome = profile?.nome || profile?.email || '';
        payload.cadastrado_por_email = profile?.email || '';
      }
      delete payload.id;
      delete payload.created_at;
      const { data, error } = editando
        ? await supabase.from('processos_administrativos').update(payload).eq('id', processoForm.id).select('*').single()
        : await supabase.from('processos_administrativos').insert(payload).select('*').single();
      if (error) throw error;
      setProcessoForm({ ...processoInicial, ...data });
      setMsg(editando ? 'Processo atualizado.' : 'Processo criado.');
      await carregar();
    } catch (error) {
      alert('Erro ao salvar processo:\n' + erroSupabase(error));
    } finally {
      setLoading(false);
    }
  }

  async function adicionarAssinante(e) {
    e.preventDefault();
    if (!docForm.id) return alert('Salve o documento antes de adicionar assinantes.');
    const telefone = normalizarTelefone(assinanteForm.telefone_whatsapp);
    const payload = {
      ...assinanteForm,
      associado_id: assinanteForm.associado_id || null,
      documento_id: docForm.id,
      telefone_whatsapp: telefone,
      token_acesso: crypto.randomUUID(),
      status: 'pendente',
      ordem: Number(assinanteForm.ordem || assinantes.length + 1)
    };
    const { error } = await supabase.from('documento_assinantes').insert(payload);
    if (error) return alert('Erro ao adicionar assinante:\n' + erroSupabase(error));
    setAssinanteForm({ ...assinanteInicial, ordem: assinantes.length + 2 });
    await carregarAssinantes(docForm.id);
  }

  async function salvarAssinaturaOficial(e) {
    e.preventDefault();
    if (!podeEditar) return;
    setLoading(true);
    try {
      let imagem_url = assinaturaForm.imagem_url || '';
      let imagem_path = assinaturaForm.imagem_path || '';
      if (arquivoAssinatura) {
        const { path, error } = await uploadArquivo(arquivoAssinatura, 'assinaturas-oficiais', BUCKET_PUBLICO);
        if (error) throw error;
        imagem_path = path;
        const { data } = supabase.storage.from(BUCKET_PUBLICO).getPublicUrl(path);
        imagem_url = data?.publicUrl || '';
      }
      const payload = {
        ...assinaturaForm,
        papel: assinaturaForm.papel,
        imagem_path,
        imagem_url,
        atualizado_por_nome: profile?.nome || profile?.email || '',
        atualizado_por_email: profile?.email || '',
        updated_at: new Date().toISOString()
      };
      const { error } = await supabase
        .from('assinaturas_institucionais')
        .upsert(payload, { onConflict: 'papel' });
      if (error) throw error;
      setAssinaturaForm(assinaturaOficialInicial);
      setArquivoAssinatura(null);
      await carregar();
      setMsg('Assinatura oficial salva.');
    } catch (error) {
      alert('Erro ao salvar assinatura oficial:\n' + erroSupabase(error));
    } finally {
      setLoading(false);
    }
  }

  async function removerAssinante(id) {
    if (!confirm('Remover assinante deste documento?')) return;
    const { error } = await supabase.from('documento_assinantes').delete().eq('id', id);
    if (error) return alert('Erro ao remover assinante:\n' + erroSupabase(error));
    await carregarAssinantes(docForm.id);
  }

  async function registrarMovimentacao(e) {
    e.preventDefault();
    if (!processoForm.id) return alert('Salve ou selecione um processo antes de registrar movimentacao.');
    const payload = {
      ...movForm,
      processo_id: processoForm.id,
      registrado_por_nome: profile?.nome || profile?.email || '',
      registrado_por_email: profile?.email || ''
    };
    const { error } = await supabase.from('processo_movimentacoes').insert(payload);
    if (error) return alert('Erro ao registrar movimentacao:\n' + erroSupabase(error));
    setMovForm(movimentacaoInicial);
    await carregarMovimentacoes(processoForm.id);
  }

  async function excluir(tabela, id) {
    if (!podeEditar || !confirm('Excluir este registro?')) return;
    const { error } = await supabase.from(tabela).delete().eq('id', id);
    if (error) alert('Erro ao excluir:\n' + erroSupabase(error));
    await carregar();
  }

  function selecionarDocumento(doc) {
    setDocForm({ ...documentoInicial, ...doc, processo_id: doc.processo_id || '' });
    setAba('documentos');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function selecionarProcesso(processo) {
    setProcessoForm({ ...processoInicial, ...processo });
    setAba('processos');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function linkAssinatura(assinante) {
    const origem = window.location.origin;
    return `${origem}/assinar/${assinante.token_acesso}`;
  }

  function mensagemWhatsApp(assinante) {
    const link = linkAssinatura(assinante);
    return encodeURIComponent(`Ola, ${assinante.nome}. Voce recebeu um documento da Associacao Amigos Carroceiros para ${assinante.tipo_assinatura === 'ciencia' ? 'ciencia' : 'assinatura'}:\n\n${docForm.titulo}\n\nAcesse pelo link:\n${link}`);
  }

  async function copiar(texto) {
    await navigator.clipboard.writeText(texto);
    setMsg('Link copiado.');
  }

  async function imprimirDocumento() {
    const conteudo_html = docForm.id ? (docForm.conteudo_html || conteudoEditorAtual()) : conteudoEditorAtual();
    const docAtual = { ...docForm, conteudo_html };
    const qr = docForm.codigo_validacao ? await gerarQrCodeDataUrl(urlValidacaoDocumento(docForm.codigo_validacao)) : '';
    const win = window.open('', '_blank');
    if (!win) return alert('O navegador bloqueou a janela. Libere pop-ups para abrir o documento.');
    win.document.write(`<!doctype html><html><head><title>${escapeHtml(docAtual.titulo || 'Documento AAC')}</title></head><body>
      <div class="print-actions"><button onclick="window.print()">Imprimir / salvar PDF</button></div>
      ${montarDocumentoOficialHtml(docAtual, assinantes, qr)}
    </body></html>`);
    win.document.close();
  }

  return (
    <PageShell
      eyebrow="Mesa Administrativa"
      title="Documentos e Processos"
      description="Crie documentos oficiais com editor, modelos, protocolos, processos, despachos, assinantes, WhatsApp, hash e QR Code de validacao."
      action={<button className="btn-secondary" onClick={carregar}><RefreshCw size={17}/> {loading ? 'Atualizando...' : 'Atualizar'}</button>}
    >
      {msg && <div className="mb-5 whitespace-pre-line rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm font-bold text-amber-800">{msg}</div>}

      <div className="mb-5 grid gap-3 md:grid-cols-4">
        <TabButton ativo={aba === 'documentos'} onClick={() => setAba('documentos')} icon={FileSignature} label="Editor" />
        <TabButton ativo={aba === 'processos'} onClick={() => setAba('processos')} icon={FolderKanban} label="Processos" />
        <TabButton ativo={aba === 'assinaturas'} onClick={() => setAba('assinaturas')} icon={BadgeCheck} label="Assinaturas" />
        <TabButton ativo={aba === 'galeria'} onClick={() => setAba('galeria')} icon={BookOpen} label="Modelos" />
        <TabButton ativo={aba === 'assinaturas-oficiais'} onClick={() => setAba('assinaturas-oficiais')} icon={Settings} label="Assinaturas oficiais" />
      </div>

      <div className="mb-5 flex items-center gap-3 rounded-3xl bg-white p-3 ring-1 ring-slate-100">
        <Search size={18} className="text-slate-400"/>
        <input value={busca} onChange={e => setBusca(e.target.value)} className="w-full bg-transparent font-semibold outline-none" placeholder="Pesquisar documentos, processos, protocolos ou interessados..." />
      </div>

      {aba === 'documentos' && (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.65fr)]">
          {podeEditar && (
            <form onSubmit={salvarDocumento} className="card p-5">
              <Header title={editandoDoc ? 'Editar documento' : 'Novo documento oficial'} icon={<FileSignature size={20}/>} onCancel={editandoDoc ? limparDoc : null} />
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <Campo label="Modelo" className="md:col-span-2">
                  <select className="field" value={docForm.modelo_slug} onChange={e => aplicarModelo(e.target.value)}>
                    {modelos.map(m => <option key={m.slug} value={m.slug}>{m.nome}</option>)}
                  </select>
                </Campo>
                <Campo label="Numero"><input className="field" value={docForm.numero_documento || ''} onChange={e => setDocForm({...docForm, numero_documento: e.target.value})} placeholder="003" /></Campo>
                <Campo label="Ano"><input className="field" value={docForm.ano_documento || anoAtual()} onChange={e => setDocForm({...docForm, ano_documento: e.target.value})} /></Campo>
                <Campo label="Titulo" className="md:col-span-2"><input className="field" value={docForm.titulo || ''} onChange={e => setDocForm({...docForm, titulo: e.target.value})} required /></Campo>
                <Campo label="Tipo"><input className="field" value={docForm.tipo_documento || ''} onChange={e => setDocForm({...docForm, tipo_documento: e.target.value})} /></Campo>
                <Campo label="Data"><input type="date" className="field" value={docForm.data_documento || ''} onChange={e => setDocForm({...docForm, data_documento: e.target.value})} /></Campo>
                <Campo label="Processo vinculado" className="md:col-span-2">
                  <select className="field" value={docForm.processo_id || ''} onChange={e => setDocForm({...docForm, processo_id: e.target.value})}>
                    <option value="">Sem processo vinculado</option>
                    {processos.map(p => <option key={p.id} value={p.id}>{p.numero_processo || 'Sem numero'} - {p.titulo}</option>)}
                  </select>
                </Campo>
                <Campo label="Interessado associado">
                  <select className="field" value={docForm.interessado_associado_id || ''} onChange={e => selecionarInteressadoAssociado(e.target.value)}>
                    <option value="">Selecionar da lista de associados</option>
                    {associados.map(a => <option key={a.id} value={a.id}>{a.nome_completo} - {a.cpf || 'sem CPF'}</option>)}
                  </select>
                </Campo>
                <Campo label="Interessado externo/livre"><input className="field" value={docForm.interessado || ''} onChange={e => setDocForm({...docForm, interessado: e.target.value, interessado_associado_id: ''})} placeholder="Associado, orgao ou parceiro" /></Campo>
                <Campo label="Status"><select className="field" value={docForm.status} onChange={e => setDocForm({...docForm, status: e.target.value})}><option value="rascunho">Rascunho</option><option value="em_assinatura">Em assinatura</option><option value="assinado">Assinado</option><option value="publicado">Publicado</option><option value="arquivado">Arquivado</option><option value="cancelado">Cancelado</option></select></Campo>
              </div>

              <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
                <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-white p-3">
                  <EditorButton onClick={() => comandoEditor('bold')} label="B" />
                  <EditorButton onClick={() => comandoEditor('italic')} label="I" />
                  <EditorButton onClick={() => comandoEditor('underline')} label="U" />
                  <EditorButton onClick={() => comandoEditor('formatBlock', 'h1')} label="H1" />
                  <EditorButton onClick={() => comandoEditor('formatBlock', 'h2')} label="H2" />
                  <EditorButton onClick={() => comandoEditor('formatBlock', 'p')} label="Texto" />
                  <EditorButton onClick={() => comandoEditor('insertUnorderedList')} label="Lista" />
                  <EditorButton onClick={() => comandoEditor('insertOrderedList')} label="1. 2." />
                  <EditorButton onClick={() => comandoEditor('justifyLeft')} label="Esq." />
                  <EditorButton onClick={() => comandoEditor('justifyCenter')} label="Centro" />
                  <EditorButton onClick={() => comandoEditor('justifyRight')} label="Dir." />
                  <EditorButton onClick={() => comandoEditor('justifyFull')} label="Justificar" />
                  <EditorButton onClick={() => {
                    const url = prompt('URL da imagem');
                    if (url) comandoEditor('insertImage', url);
                  }} label="Imagem" />
                  <EditorButton onClick={() => comandoEditor('insertHTML', '<table><tbody><tr><td>Campo</td><td>Informacao</td></tr><tr><td></td><td></td></tr></tbody></table>')} label="Tabela" />
                </div>
                <div className="max-h-[760px] overflow-auto p-5">
                  <div className="mx-auto min-h-[720px] max-w-[794px] bg-white p-10 text-slate-900 shadow-xl">
                    <div className="mb-7 flex items-center gap-4 border-b-4 border-floresta pb-4">
                      <img src="/logo.png" alt="Logo AAC" className="h-16 w-16 object-contain" />
                      <div>
                        <p className="text-xl font-black uppercase text-floresta">Associacao Amigos Carroceiros - AAC</p>
                        <p className="text-xs font-semibold text-slate-500">CNPJ 67.138.262/0001-98 | Sao Francisco do Sul - SC</p>
                        <p className="text-xs font-semibold text-slate-500">{docForm.tipo_documento} {docForm.numero_documento ? `No ${docForm.numero_documento}/${docForm.ano_documento}` : ''}</p>
                      </div>
                    </div>
                    <div
                      id="editor-documento-aac"
                      ref={editorRef}
                      className="prose max-w-none min-h-[520px] outline-none [&_img]:max-w-full [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-slate-300 [&_td]:p-2"
                      contentEditable
                      dir="ltr"
                      suppressContentEditableWarning
                    />
                  </div>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                <button className="btn-primary" disabled={loading}><Save size={18}/> Salvar documento</button>
                <button type="button" className="btn-secondary" onClick={imprimirDocumento} disabled={!docForm.titulo}><FileDown size={18}/> Gerar PDF</button>
                {editandoDoc && <button type="button" className="btn-secondary" onClick={() => setAba('assinaturas')}><UserPlus size={18}/> Assinantes</button>}
              </div>
            </form>
          )}

          <div className="space-y-4">
            <InfoModelo modelo={modeloAtual} />
            <ListaDocumentos documentos={docsFiltrados} podeEditar={podeEditar} selecionar={selecionarDocumento} excluir={id => excluir('documentos_processos', id)} />
          </div>
        </div>
      )}

      {aba === 'processos' && (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
          {podeEditar && (
            <form onSubmit={salvarProcesso} className="card p-5">
              <Header title={editandoProcesso ? 'Editar processo' : 'Novo processo administrativo'} icon={<FolderKanban size={20}/>} onCancel={editandoProcesso ? limparProcesso : null} />
              <div className="grid gap-4 md:grid-cols-2">
                <Campo label="Numero do processo"><input className="field" value={processoForm.numero_processo || ''} onChange={e => setProcessoForm({...processoForm, numero_processo: e.target.value})} placeholder="AAC-PROC-2026-0001" /></Campo>
                <Campo label="Tipo"><select className="field" value={processoForm.tipo} onChange={e => setProcessoForm({...processoForm, tipo: e.target.value})}><option>Administrativo</option><option>Financeiro</option><option>RGA / Animal</option><option>Associado</option><option>Parceria</option><option>Fiscalizacao</option><option>Compras / Doacoes</option></select></Campo>
                <Campo label="Titulo" className="md:col-span-2"><input className="field" value={processoForm.titulo || ''} onChange={e => setProcessoForm({...processoForm, titulo: e.target.value})} required /></Campo>
                <Campo label="Interessado"><input className="field" value={processoForm.interessado || ''} onChange={e => setProcessoForm({...processoForm, interessado: e.target.value})} /></Campo>
                <Campo label="Data de abertura"><input type="date" className="field" value={processoForm.data_abertura || ''} onChange={e => setProcessoForm({...processoForm, data_abertura: e.target.value})} /></Campo>
                <Campo label="Status"><select className="field" value={processoForm.status} onChange={e => setProcessoForm({...processoForm, status: e.target.value})}><option value="aberto">Aberto</option><option value="em_analise">Em analise</option><option value="encerrado">Encerrado</option><option value="arquivado">Arquivado</option><option value="cancelado">Cancelado</option></select></Campo>
                <Campo label="Prioridade"><select className="field" value={processoForm.prioridade} onChange={e => setProcessoForm({...processoForm, prioridade: e.target.value})}><option value="baixa">Baixa</option><option value="normal">Normal</option><option value="alta">Alta</option><option value="urgente">Urgente</option></select></Campo>
                <Campo label="Descricao" className="md:col-span-2"><textarea className="field" value={processoForm.descricao || ''} onChange={e => setProcessoForm({...processoForm, descricao: e.target.value})} /></Campo>
              </div>
              <button className="btn-primary mt-5" disabled={loading}><Save size={18}/> Salvar processo</button>

              {processoForm.id && (
                <div className="mt-7 border-t border-slate-100 pt-5">
                  <h3 className="mb-4 text-lg font-black text-floresta">Despacho / movimentacao</h3>
                  <div className="grid gap-3">
                    <select className="field" value={movForm.tipo} onChange={e => setMovForm({...movForm, tipo: e.target.value})}><option value="despacho">Despacho</option><option value="tramitacao">Tramitacao</option><option value="ciencia">Ciencia</option><option value="anexo">Anexo</option><option value="arquivamento">Arquivamento</option></select>
                    <input className="field" value={movForm.destino || ''} onChange={e => setMovForm({...movForm, destino: e.target.value})} placeholder="Destino/unidade/pessoa" />
                    <input type="date" className="field" value={movForm.prazo || ''} onChange={e => setMovForm({...movForm, prazo: e.target.value})} />
                    <textarea className="field" value={movForm.descricao || ''} onChange={e => setMovForm({...movForm, descricao: e.target.value})} placeholder="Texto do despacho ou andamento" />
                    <button type="button" className="btn-secondary" onClick={registrarMovimentacao}><Send size={16}/> Registrar movimentacao</button>
                  </div>
                </div>
              )}
            </form>
          )}

          <div className="space-y-5">
            <ListaProcessos processos={processosFiltrados} selecionar={selecionarProcesso} excluir={id => excluir('processos_administrativos', id)} podeEditar={podeEditar} />
            {processoForm.id && <LinhaTempo movimentacoes={movimentacoes} />}
          </div>
        </div>
      )}

      {aba === 'assinaturas' && (
        <div className="grid gap-6 xl:grid-cols-[minmax(360px,0.65fr)_minmax(0,1.35fr)]">
          <form onSubmit={adicionarAssinante} className="card p-5">
            <Header title="Assinantes do documento" icon={<FileCheck2 size={20}/>} />
            <div className="mb-4 rounded-2xl bg-creme p-4 text-sm font-semibold text-slate-700">
              Selecione ou preencha quem assina. O sistema gera um link seguro para enviar pelo WhatsApp.
            </div>
            <div className="grid gap-3">
              <select className="field" value={assinanteForm.associado_id || ''} onChange={e => selecionarAssinanteAssociado(e.target.value)}>
                <option value="">Selecionar associado cadastrado</option>
                {associados.map(a => <option key={a.id} value={a.id}>{a.nome_completo} - {a.telefone_whatsapp || 'sem WhatsApp'}</option>)}
              </select>
              <input className="field" value={assinanteForm.nome} onChange={e => setAssinanteForm({...assinanteForm, nome: e.target.value})} placeholder="Nome do assinante" required />
              <input className="field" value={assinanteForm.cargo} onChange={e => setAssinanteForm({...assinanteForm, cargo: e.target.value})} placeholder="Cargo / funcao" />
              <input className="field" value={assinanteForm.cpf} onChange={e => setAssinanteForm({...assinanteForm, cpf: cpfMask(e.target.value)})} placeholder="CPF para conferencia" />
              <input className="field" value={assinanteForm.telefone_whatsapp} onChange={e => setAssinanteForm({...assinanteForm, telefone_whatsapp: phoneMask(e.target.value)})} placeholder="WhatsApp" required />
              <select className="field" value={assinanteForm.tipo_assinatura} onChange={e => setAssinanteForm({...assinanteForm, tipo_assinatura: e.target.value})}><option value="assinatura">Assinatura</option><option value="ciencia">Ciencia</option><option value="visto">Visto</option></select>
              <button className="btn-primary" disabled={!docForm.id}><UserPlus size={18}/> Adicionar assinante</button>
            </div>
          </form>

          <div className="card p-5">
            <h2 className="text-xl font-black text-floresta">{docForm.id ? docForm.titulo : 'Selecione um documento'}</h2>
            {!docForm.id && <p className="mt-2 text-slate-600">Abra um documento na aba Editor para gerenciar assinaturas.</p>}
            {assinantes.length === 0 && docForm.id ? <EmptyState>Nenhum assinante adicionado.</EmptyState> : (
              <div className="mt-5 grid gap-3">
                {assinantes.map(assinante => {
                  const link = linkAssinatura(assinante);
                  const telefone = normalizarTelefone(assinante.telefone_whatsapp);
                  return (
                    <div key={assinante.id} className="rounded-2xl border border-slate-100 bg-white p-4">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                          <p className="font-black text-floresta">{assinante.nome}</p>
                          <p className="text-sm text-slate-500">{assinante.cargo || 'Sem cargo'} | {statusLabel(assinante.status)}</p>
                          {assinante.assinado_em && <p className="text-xs font-bold text-green-700">Assinado em {dateTimeBR(assinante.assinado_em)}</p>}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <a className="btn-secondary" href={`https://wa.me/${telefone}?text=${mensagemWhatsApp(assinante)}`} target="_blank" rel="noreferrer"><MessageCircle size={16}/> WhatsApp</a>
                          <button type="button" className="btn-secondary" onClick={() => copiar(link)}><Copy size={16}/> Copiar link</button>
                          {podeEditar && <button type="button" className="rounded-2xl bg-red-50 px-3 py-2 font-bold text-red-700" onClick={() => removerAssinante(assinante.id)}><Trash2 size={16}/></button>}
                        </div>
                      </div>
                      <p className="mt-3 break-all rounded-xl bg-slate-50 p-3 text-xs font-semibold text-slate-500">{link}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {aba === 'galeria' && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {modelos.map(modelo => (
            <article key={modelo.slug} className="card p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="badge bg-creme text-floresta">{modelo.tipo}</span>
                  <h3 className="mt-3 text-xl font-black text-floresta">{modelo.nome}</h3>
                </div>
                <FileText className="text-terra" />
              </div>
              <p className="mt-3 text-slate-600">{modelo.descricao}</p>
              <p className="mt-3 text-xs font-bold uppercase tracking-wide text-slate-500">Campos: {formatarCampos(modelo.campos)}</p>
              <button className="btn-secondary mt-4" onClick={() => { aplicarModelo(modelo.slug); setAba('documentos'); }}><Plus size={16}/> Usar modelo</button>
            </article>
          ))}
        </div>
      )}

      {aba === 'assinaturas-oficiais' && (
        <div className="grid gap-6 xl:grid-cols-[minmax(360px,0.75fr)_minmax(0,1.25fr)]">
          <form onSubmit={salvarAssinaturaOficial} className="card p-5">
            <Header title="Assinatura oficial" icon={<FileCog size={20}/>} />
            <div className="mb-4 rounded-2xl bg-creme p-4 text-sm font-semibold text-slate-700">
              Cadastre os PNGs das assinaturas que devem aparecer automaticamente em carteirinhas e documentos institucionais.
            </div>
            <div className="grid gap-3">
              <select className="field" value={assinaturaForm.papel} onChange={e => setAssinaturaForm({...assinaturaForm, papel: e.target.value})}>
                <option value="presidente">Presidente</option>
                <option value="secretaria">Secretaria</option>
                <option value="bem_estar_animal">Bem-Estar Animal</option>
                <option value="tesouraria">Tesouraria</option>
                <option value="conselho_fiscal">Conselho Fiscal</option>
              </select>
              <input className="field" value={assinaturaForm.nome || ''} onChange={e => setAssinaturaForm({...assinaturaForm, nome: e.target.value})} placeholder="Nome completo" />
              <input className="field" value={assinaturaForm.cargo || ''} onChange={e => setAssinaturaForm({...assinaturaForm, cargo: e.target.value})} placeholder="Cargo exibido" />
              <input className="field" value={assinaturaForm.imagem_url || ''} onChange={e => setAssinaturaForm({...assinaturaForm, imagem_url: e.target.value})} placeholder="URL do PNG, se já estiver online" />
              <input type="file" accept="image/png,image/jpeg,image/webp" className="field" onChange={e => setArquivoAssinatura(e.target.files?.[0] || null)} />
              {arquivoAssinatura && <p className="text-xs font-bold text-floresta">Selecionado: {arquivoAssinatura.name}</p>}
              <button className="btn-primary" disabled={loading}><Upload size={18}/> Salvar assinatura</button>
            </div>
          </form>

          <div className="card p-5">
            <h2 className="text-xl font-black text-floresta">Assinaturas cadastradas</h2>
            {!assinaturasOficiais.length ? <EmptyState>Nenhuma assinatura oficial cadastrada.</EmptyState> : (
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                {assinaturasOficiais.map(item => (
                  <article key={item.id || item.papel} className="rounded-2xl border border-slate-100 bg-white p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="badge bg-creme text-floresta">{item.papel}</span>
                        <h3 className="mt-2 font-black text-floresta">{item.nome || 'Sem nome'}</h3>
                        <p className="text-sm text-slate-500">{item.cargo || '-'}</p>
                      </div>
                      <button type="button" className="btn-secondary" onClick={() => setAssinaturaForm({...assinaturaOficialInicial, ...item})}><Edit3 size={15}/> Editar</button>
                    </div>
                    {item.imagem_url && <div className="mt-4 rounded-xl bg-slate-50 p-3"><img src={item.imagem_url} alt={item.nome || item.papel} className="h-16 max-w-full object-contain" /></div>}
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </PageShell>
  );
}

function TabButton({ ativo, onClick, icon: Icon, label }) {
  return (
    <button onClick={onClick} className={`rounded-2xl p-4 text-left font-black ring-1 transition ${ativo ? 'bg-floresta text-white ring-floresta' : 'bg-white text-floresta ring-slate-100 hover:bg-creme'}`}>
      <Icon className="mb-2" />
      {label}
    </button>
  );
}

function Header({ title, icon, onCancel }) {
  return (
    <div className="mb-5 flex items-center justify-between gap-3">
      <h2 className="flex items-center gap-2 text-xl font-black text-floresta">{icon}{title}</h2>
      {onCancel && <button type="button" className="btn-secondary" onClick={onCancel}><X size={16}/> Cancelar</button>}
    </div>
  );
}

function Campo({ label, children, className = '' }) {
  return <div className={className}><label className="label">{label}</label>{children}</div>;
}

function EditorButton({ label, onClick }) {
  return <button type="button" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-black text-floresta hover:bg-creme" onClick={onClick}>{label}</button>;
}

function InfoModelo({ modelo }) {
  return (
    <div className="card p-5">
      <h3 className="text-lg font-black text-floresta">Modelo selecionado</h3>
      <p className="mt-2 font-bold text-slate-700">{modelo.nome}</p>
      <p className="mt-2 text-sm text-slate-600">{modelo.descricao}</p>
      <p className="mt-3 text-xs font-black uppercase tracking-wide text-terra">Campos inteligentes</p>
      <p className="mt-1 text-sm text-slate-600">{formatarCampos(modelo.campos)}</p>
    </div>
  );
}

function ListaDocumentos({ documentos, selecionar, excluir, podeEditar }) {
  if (!documentos.length) return <EmptyState>Nenhum documento encontrado.</EmptyState>;
  return (
    <div className="card p-5">
      <h3 className="mb-4 text-lg font-black text-floresta">Documentos recentes</h3>
      <div className="space-y-3">
        {documentos.map(doc => (
          <article key={doc.id} className="rounded-2xl border border-slate-100 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="badge bg-creme text-floresta">{doc.tipo_documento}</span>
                <h4 className="mt-2 font-black text-floresta">{doc.titulo}</h4>
                <p className="text-sm text-slate-500">{doc.numero_documento ? `No ${doc.numero_documento}/${doc.ano_documento}` : 'Sem numero'} | {statusLabel(doc.status)}</p>
                {doc.codigo_validacao && <p className="mt-1 flex items-center gap-1 text-xs font-bold text-green-700"><Hash size={13}/> {doc.codigo_validacao}</p>}
              </div>
              <div className="flex gap-2">
                <button className="btn-secondary" onClick={() => selecionar(doc)}><Edit3 size={15}/> Abrir</button>
                {podeEditar && <button className="rounded-2xl bg-red-50 px-3 py-2 text-red-700" onClick={() => excluir(doc.id)}><Trash2 size={15}/></button>}
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function ListaProcessos({ processos, selecionar, excluir, podeEditar }) {
  if (!processos.length) return <EmptyState>Nenhum processo cadastrado.</EmptyState>;
  return (
    <div className="card p-5">
      <h3 className="mb-4 text-lg font-black text-floresta">Processos administrativos</h3>
      <div className="table-wrap shadow-none">
        <table className="table">
          <thead><tr><th>Processo</th><th>Interessado</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {processos.map(p => <tr key={p.id}>
              <td><strong className="text-floresta">{p.numero_processo || 'Sem numero'}</strong><br />{p.titulo}</td>
              <td>{p.interessado || '-'}<br/><span className="text-xs font-bold text-terra">{p.tipo}</span></td>
              <td>{statusLabel(p.status)}<br/><span className="text-xs text-slate-500">{dateBR(p.data_abertura)}</span></td>
              <td><div className="flex gap-2"><button className="btn-secondary" onClick={() => selecionar(p)}><ClipboardList size={15}/> Abrir</button>{podeEditar && <button className="rounded-xl bg-red-50 p-2 text-red-700" onClick={() => excluir(p.id)}><Trash2 size={15}/></button>}</div></td>
            </tr>)}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function LinhaTempo({ movimentacoes }) {
  return (
    <div className="card p-5">
      <h3 className="mb-4 flex items-center gap-2 text-lg font-black text-floresta"><Link2 size={18}/> Historico do processo</h3>
      {!movimentacoes.length ? <EmptyState>Nenhuma movimentacao registrada.</EmptyState> : (
        <div className="space-y-3">
          {movimentacoes.map(m => (
            <div key={m.id} className="rounded-2xl border border-slate-100 p-4">
              <p className="font-black text-floresta">{m.tipo} {m.destino ? `para ${m.destino}` : ''}</p>
              <p className="mt-1 text-sm text-slate-600">{m.descricao}</p>
              <p className="mt-2 text-xs font-bold text-slate-400">{dateTimeBR(m.created_at)} {m.prazo ? `| Prazo: ${dateBR(m.prazo)}` : ''}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
