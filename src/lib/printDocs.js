import { dateBR, money } from './format';
import { gerarQrCodeDataUrl } from './qrcode';
import { supabase } from './supabase';

const PAINEL_PUBLICO_FALLBACK = 'https://painel.amigoscarroceiros.org.br';
const CNPJ_AAC = '67.138.262/0001-98';
const SEDE_AAC = 'Rua Palma Sola, nº 383, Bairro Ubatuba, São Francisco do Sul/SC';

function baseConsultaPublica() {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }
  return PAINEL_PUBLICO_FALLBACK;
}

function urlConsultaPublica(tipo, codigo) {
  const codigoLimpo = String(codigo || '').trim();
  return `${baseConsultaPublica()}/consulta/${tipo}/${encodeURIComponent(codigoLimpo)}`;
}

export function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function valorOuLinha(value, tamanho = 24) {
  const v = String(value ?? '').trim();
  return v ? escapeHtml(v) : '_'.repeat(tamanho);
}

function checked(condicao) {
  return condicao ? 'X' : '&nbsp;';
}

function dataPorExtenso(data = new Date()) {
  const d = data instanceof Date ? data : new Date(data);
  if (Number.isNaN(d.getTime())) return '______ de __________________ de 2026';
  return `${String(d.getDate()).padStart(2, '0')} de ${d.toLocaleString('pt-BR', { month: 'long' })} de ${d.getFullYear()}`;
}

function nomeOperador(operador) {
  return operador?.nome || operador?.email || operador?.user_metadata?.name || 'Usuário interno da AAC';
}

function emailOperador(operador) {
  return operador?.email || operador?.user?.email || '';
}

function metaDocumento({ cadastradoPor, emitidoPor, emitidoEm = new Date(), extra = '' } = {}) {
  const emissor = nomeOperador(emitidoPor);
  const email = emailOperador(emitidoPor);
  return `<div class="document-meta no-break">
    <strong>Controle interno do documento</strong><br>
    ${cadastradoPor ? `Cadastro lançado por: ${escapeHtml(cadastradoPor)}<br>` : ''}
    Emitido por: ${escapeHtml(emissor)}${email ? ` (${escapeHtml(email)})` : ''}<br>
    Data/hora da emissão: ${escapeHtml(new Date(emitidoEm).toLocaleString('pt-BR'))}${extra ? `<br>${extra}` : ''}
  </div>`;
}


function validacaoDocumentoHtml(validacao) {
  if (!validacao?.codigo_validacao) return '';
  const url = validacao.url_validacao || `${baseConsultaPublica()}/validar/${encodeURIComponent(validacao.codigo_validacao)}`;
  return `Código de validação: <strong>${escapeHtml(validacao.codigo_validacao)}</strong><br>Valide em: ${escapeHtml(url)}`;
}

async function carregarAssinaturasInstitucionais() {
  try {
    const { data, error } = await supabase
      .from('assinaturas_institucionais')
      .select('*')
      .eq('ativo', true);
    if (error) return {};
    return (data || []).reduce((acc, item) => {
      acc[item.papel] = item;
      return acc;
    }, {});
  } catch {
    return {};
  }
}

function assinaturaInstitucionalHtml(item, fallback) {
  const nome = item?.nome || '';
  const cargo = item?.cargo || fallback;
  const imagem = item?.imagem_url || '';
  return `<div class="signature official-signature">
    ${imagem ? `<img class="signature-img" src="${escapeHtml(imagem)}" alt="${escapeHtml(cargo)}">` : ''}
    <strong>${escapeHtml(nome || cargo)}</strong><br>
    ${escapeHtml(cargo)}
  </div>`;
}

function aguardarImagens(documento) {
  const imagens = Array.from(documento.images || []);
  if (!imagens.length) return Promise.resolve();

  return Promise.allSettled(
    imagens.map((img) => {
      if (img.complete) return Promise.resolve();
      return new Promise((resolve) => {
        img.addEventListener('load', resolve, { once: true });
        img.addEventListener('error', resolve, { once: true });
      });
    })
  );
}

function abrirJanelaImpressao(titulo, html) {
  const win = window.open('', '_blank', 'width=1100,height=900');
  if (!win) {
    alert('O navegador bloqueou a janela de impressão. Libere pop-ups para este site.');
    return;
  }

  win.document.open();
  win.document.write(`<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(titulo)}</title>
  ${estilosImpressao()}
</head>
<body>
  ${html}
  <script>
    async function prepararImpressao() {
      const imagens = Array.from(document.images || []);
      await Promise.allSettled(imagens.map((img) => {
        if (img.complete) return Promise.resolve();
        return new Promise((resolve) => {
          img.addEventListener('load', resolve, { once: true });
          img.addEventListener('error', resolve, { once: true });
        });
      }));
      if (document.fonts && document.fonts.ready) {
        try { await document.fonts.ready; } catch (e) {}
      }
      setTimeout(() => window.print(), 350);
    }
    window.addEventListener('load', prepararImpressao);
  <\/script>
</body>
</html>`);
  win.document.close();

  // Garante compatibilidade em navegadores que não disparam load em janela escrita por script.
  setTimeout(() => aguardarImagens(win.document), 250);
}

function estilosImpressao() {
  return `<style>
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; }
    body {
      font-family: Arial, Helvetica, sans-serif;
      background: #e5e7eb;
      color: #111827;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .page {
      width: 194mm;
      min-height: 281mm;
      margin: 8mm auto;
      background: #fff;
      padding: 0;
      box-shadow: 0 8px 30px #0002;
      break-after: page;
      page-break-after: always;
      overflow: hidden;
    }
    .page:last-child { break-after: auto; page-break-after: auto; }
    .page-inner { padding: 8mm; }
    .page.landscape { width: 281mm; min-height: 194mm; }
    .header {
      display: flex;
      align-items: center;
      gap: 10px;
      border-bottom: 2px solid #163f2a;
      padding-bottom: 7px;
      margin-bottom: 8px;
    }
    .logo { width: 50px; height: 50px; object-fit: contain; flex: 0 0 auto; }
    .title { font-size: 15px; font-weight: 900; color: #163f2a; text-transform: uppercase; line-height: 1.15; }
    .subtitle { font-size: 10px; color: #374151; line-height: 1.25; }
    .doc-title { text-align: center; font-size: 13px; font-weight: 900; margin: 7px 0; text-decoration: underline; }
    .section-title {
      background: #f3f4f6;
      border: 1px solid #111;
      padding: 4px 6px;
      font-weight: 900;
      text-transform: uppercase;
      margin-top: 7px;
      font-size: 10.5px;
      line-height: 1.25;
    }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 8px; }
    .line { border-bottom: 1px solid #111; min-height: 17px; padding-top: 3px; font-size: 9.8px; line-height: 1.2; }
    .full { grid-column: 1 / -1; }
    .small { font-size: 9px; }
    .terms { font-size: 9.8px; line-height: 1.28; text-align: justify; }
    .terms p { margin: 4px 0; }
    .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 24mm; }
    .signature { border-top: 1px solid #111; text-align: center; padding-top: 8px; font-size: 9.5px; min-height: 13mm; }
    .official-signature { position: relative; min-height: 16mm; }
    .signature-img { display: block; height: 10mm; max-width: 100%; object-fit: contain; margin: -8mm auto 0; }
    .document-meta { margin-top: 7px; padding: 6px 8px; border: 1px dashed #9ca3af; background: #f9fafb; font-size: 8.8px; line-height: 1.35; color: #374151; }
    .decision { border: 1px solid #111; padding: 6px; margin-top: 10px; font-size: 9.5px; line-height: 1.25; }
    .table { width: 100%; border-collapse: collapse; margin-top: 6px; font-size: 9.5px; line-height: 1.22; table-layout: fixed; }
    .table th, .table td { border: 1px solid #111; padding: 4px 5px; text-align: left; vertical-align: top; word-break: break-word; }
    .table th { background: #f3f4f6; }
    .badge { display: inline-block; border: 1px solid #111; border-radius: 999px; padding: 2px 6px; }
    .muted { color: #6b7280; }
    .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
    .notice { border-left: 4px solid #c8963e; background: #fff7ed; padding: 8px; font-size: 10px; margin: 8px 0; }

    .doc-associado .doc-title { margin: 6px 0; }
    .doc-associado .section-title { margin-top: 6px; }
    .doc-associado .signatures { margin-top: 18mm; }
    .doc-associado .decision { margin-top: 8px; }

    .rga-page .header { margin-bottom: 7px; }
    .rga-page .rga-resenha {
      display: block;
      width: 100%;
      height: 145mm;
      object-fit: contain;
      border: 1px solid #111;
      margin-top: 6px;
      background: #fff;
    }
    .rga-page-2 .table { font-size: 11px; }
    .rga-page-2 .table th, .rga-page-2 .table td { padding: 8px 7px; }
    .rga-page-2 .responsabilidade { margin-top: 20mm; font-size: 12px; line-height: 1.45; }

    .card-print {
      border: 1px solid #111;
      border-radius: 18px;
      overflow: hidden;
      width: 85.6mm;
      height: 53.98mm;
      background: #fff;
      display: grid;
      grid-template-columns: 1fr 31mm;
    }
    .card-front { padding: 8px; background: linear-gradient(135deg, #163f2a, #1a365d); color: white; }
    .card-back { padding: 8px; }
    .card-back-full { display: flex; flex-direction: column; height: 100%; }
    .card-logo { width: 36px; height: 36px; object-fit: contain; background: white; border-radius: 9px; padding: 3px; }
    .card-name { font-size: 13px; font-weight: 900; margin-top: 5px; }
    .card-info { font-size: 8.5px; margin-top: 4px; line-height: 1.35; }
    .qr { width: 24mm; height: 24mm; object-fit: contain; background: white; padding: 2px; border-radius: 6px; }
    .cardsheet { display: grid; grid-template-columns: repeat(2, 85.6mm); gap: 12mm; align-items: start; }
    .card-signatures {
      margin-top: auto !important;
      padding-top: 10px;
      gap: 10px !important;
    }
    .card-signatures .signature {
      min-height: 12mm;
      padding-top: 5px;
      font-size: 7.6px;
      line-height: 1.15;
    }
    .card-signatures .signature-img {
      height: 7.5mm;
      margin: -5mm auto 0;
    }
    .no-break { break-inside: avoid; page-break-inside: avoid; }
    .print-actions { position: fixed; right: 16px; top: 16px; display: flex; gap: 8px; z-index: 999; }
    .print-actions button { border: 0; border-radius: 12px; background: #163f2a; color: white; padding: 10px 14px; font-weight: 700; cursor: pointer; }
    .foto-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-top: 8px; }
    .foto-box { border: 1px solid #111; min-height: 48mm; display: flex; flex-direction: column; justify-content: space-between; background: #fff; }
    .foto-box img { width: 100%; height: 43mm; object-fit: cover; display: block; }
    .foto-box span { display: block; border-top: 1px solid #111; padding: 3px 5px; font-size: 9px; font-weight: 900; text-align: center; }
    .alerta { border-left: 4px solid #b45309; background: #fffbeb; padding: 7px; margin: 5px 0; font-size: 10px; }
    .mini-list { margin: 6px 0 0 0; padding-left: 16px; font-size: 10px; line-height: 1.35; }
    .prontuario-page .table { font-size: 9px; }
    .prontuario-page .table th, .prontuario-page .table td { padding: 3px 4px; }

    @page { size: A4; margin: 8mm; }
    @media print {
      body { background: #fff; }
      .page {
        width: auto;
        min-height: auto;
        margin: 0;
        box-shadow: none;
        overflow: visible;
      }
      .page-inner { padding: 0; }
      .page.landscape { width: auto; min-height: auto; }
      .print-actions { display: none; }
    }
  </style>`;
}

function enderecoAssociado(a) {
  return [
    a.rua_logradouro || a.endereco_residencial,
    a.numero,
    a.complemento,
    a.bairro,
    a.cidade || 'São Francisco do Sul',
    a.uf || 'SC',
    a.cep
  ].filter(Boolean).join(', ');
}


function labelStatus(value) {
  const mapa = {
    ativo: 'Ativo', suspenso: 'Suspenso', inativo: 'Inativo', pendente: 'Pendente',
    aprovado: 'Aprovado', reprovado: 'Reprovado',
    apto: 'Apto', inapto: 'Inapto', em_observacao: 'Em observação', pendente_vistoria: 'Pendente de vistoria',
    negativo: 'Negativo', positivo: 'Positivo', em_dia: 'Em dia', vencido: 'Vencido', realizado: 'Realizado',
    bom: 'Bom', regular: 'Regular', ruim: 'Ruim'
  };
  return mapa[value] || value || 'Não informado';
}

function diasPara(data) {
  if (!data) return null;
  const hoje = new Date();
  const alvo = new Date(data + 'T00:00:00');
  if (Number.isNaN(alvo.getTime())) return null;
  hoje.setHours(0,0,0,0);
  return Math.ceil((alvo - hoje) / 86400000);
}

function alertaValidade(label, data) {
  const dias = diasPara(data);
  if (dias === null) return `${label}: sem validade informada`;
  if (dias < 0) return `${label}: vencido há ${Math.abs(dias)} dia(s)`;
  if (dias <= 30) return `${label}: vence em ${dias} dia(s)`;
  return `${label}: válido até ${dateBR(data)}`;
}

function fotoBloco(src, titulo) {
  if (!src) return '';
  return `<div class="foto-box"><img src="${escapeHtml(src)}" alt="${escapeHtml(titulo)}"><span>${escapeHtml(titulo)}</span></div>`;
}

function mascararCpf(cpf = '') {
  const digitos = String(cpf || '').replace(/\D/g, '');
  if (digitos.length !== 11) return cpf ? '***.' + escapeHtml(String(cpf).slice(-6)) : '-';
  return `***.${digitos.slice(3, 6)}.${digitos.slice(6, 9)}-**`;
}

function fichaAssociadoBody(a, operador = null, validacao = null) {
  return `<main class="page doc-associado">
    <div class="page-inner">
      <div class="header">
        <img class="logo" src="/logo.png" alt="Logo AAC">
        <div>
          <div class="title">Associação Amigos Carroceiros (AAC)</div>
          <div class="subtitle">CNPJ: ${CNPJ_AAC}<br>Sede Provisória: ${SEDE_AAC}</div>
        </div>
      </div>

      <div class="doc-title">FICHA DE INSCRIÇÃO E CADASTRO DE ASSOCIADO</div>
      <div class="grid">
        <div class="line">Nº DA FICHA: <strong>${valorOuLinha(a.numero_ficha || a.matricula, 10)}</strong> <span class="small">(Uso da Secretaria)</span></div>
        <div class="line">DATA DE ADMISSÃO: <strong>${valorOuLinha(dateBR(a.data_admissao), 12)}</strong></div>
      </div>

      <div class="section-title">1. Dados pessoais</div>
      <div class="grid">
        <div class="line full">Nome Completo: <strong>${valorOuLinha(a.nome_completo, 82)}</strong></div>
        <div class="line">Data de Nascimento: <strong>${valorOuLinha(dateBR(a.data_nascimento), 14)}</strong></div>
        <div class="line">Estado Civil: <strong>${valorOuLinha(a.estado_civil, 25)}</strong></div>
        <div class="line">Nacionalidade: <strong>${valorOuLinha(a.nacionalidade, 20)}</strong></div>
        <div class="line">Profissão: <strong>${valorOuLinha(a.profissao, 28)}</strong></div>
        <div class="line">RG nº: <strong>${valorOuLinha(a.rg, 18)}</strong> Órgão Emissor/UF: <strong>${valorOuLinha(a.orgao_emissor_uf, 8)}</strong></div>
        <div class="line">CPF nº: <strong>${valorOuLinha(a.cpf, 20)}</strong></div>
        <div class="line">WhatsApp/Telefone: <strong>${valorOuLinha(a.telefone_whatsapp, 24)}</strong></div>
        <div class="line">E-mail: <strong>${valorOuLinha(a.email, 32)}</strong></div>
      </div>

      <div class="section-title">2. Endereço residencial</div>
      <div class="grid">
        <div class="line">Rua/Logradouro: <strong>${valorOuLinha(a.rua_logradouro || a.endereco_residencial, 36)}</strong></div>
        <div class="line">Nº: <strong>${valorOuLinha(a.numero, 10)}</strong></div>
        <div class="line">Complemento: <strong>${valorOuLinha(a.complemento, 20)}</strong></div>
        <div class="line">Bairro: <strong>${valorOuLinha(a.bairro, 25)}</strong></div>
        <div class="line">Cidade: <strong>${valorOuLinha(a.cidade || 'São Francisco do Sul', 25)}</strong></div>
        <div class="line">UF: <strong>${valorOuLinha(a.uf || 'SC', 3)}</strong> CEP: <strong>${valorOuLinha(a.cep, 14)}</strong></div>
      </div>

      <div class="section-title">3. Informações de atividade</div>
      <div class="terms">
        <p>[ ${checked(a.atividade_proprietario)} ] Proprietário de Cavalo/Carroça &nbsp;&nbsp; [ ${checked(a.atividade_frete)} ] Prestador de Serviços de Frete &nbsp;&nbsp; [ ${checked(a.atividade_apoiador)} ] Sócio Apoiador/Voluntário</p>
      </div>

      <div class="doc-title">TERMO DE DECLARAÇÃO E COMPROMISSO</div>
      <div class="terms">
        <p>Pelo presente instrumento, solicito a minha admissão no quadro de Sócios Contribuintes da Associação Amigos Carroceiros (AAC). Declaro estar ciente e de pleno acordo com as normas estatutárias e regimentais da entidade, bem como com as condições financeiras deliberadas pela Diretoria Executiva por meio da Resolução nº 01/2026.</p>
        <p>Comprometo-me a efetuar o pagamento da contribuição associativa mensal no valor de <strong>R$ 25,00 (vinte e cinco reais)</strong>. Estou ciente de que o vencimento padrão das mensalidades ocorrerá rigorosamente todo dia <strong>15</strong> de cada mês.</p>
        <p>Reconheço que o atraso no pagamento sujeitará a cobrança de juros de mora de <strong>1% ao mês, pro rata die</strong>, sem aplicação de multa. Tenho ciência de que o atraso consecutivo de <strong>3 parcelas</strong> poderá resultar na exclusão do quadro de associados, com perda dos direitos e benefícios junto à instituição.</p>
        <p>Por ser a expressão da verdade, firmo a presente solicitação.</p>
        <p>São Francisco do Sul/SC, ${dataPorExtenso(a.data_admissao || new Date())}.</p>
      </div>

      ${metaDocumento({ cadastradoPor: a.cadastrado_por_nome || a.atualizado_por_nome, emitidoPor: operador, extra: validacaoDocumentoHtml(validacao) })}

      <div class="signatures">
        <div class="signature">Assinatura do Associado Proponente</div>
        <div class="signature">Secretaria / Responsável pelo cadastro</div>
      </div>

      <div class="decision">
        <strong>DESPACHO DA DIRETORIA EXECUTIVA (Uso Interno):</strong><br>
        A Diretoria Executiva da AAC, em análise à presente solicitação, resolve:<br><br>
        ( &nbsp; ) DEFERIR (Aprovar) a inclusão do associado. &nbsp;&nbsp; ( &nbsp; ) INDEFERIR (Recusar) a inclusão do associado.<br><br>
        Presidente/responsável: ______________________________________ Data: ____/____/______
      </div>
    </div>
  </main>`;
}

export function htmlFichaAssociadoAssinavel(a, operador = null, validacao = null) {
  return `${estilosImpressao()}${fichaAssociadoBody(a, operador, validacao)}`;
}

export function imprimirFichaAssociado(a, operador = null, validacao = null) {
  const html = `<div class="print-actions"><button onclick="window.print()">Imprimir / salvar PDF</button></div>${fichaAssociadoBody(a, operador, validacao)}`;

  abrirJanelaImpressao(`Ficha de associado - ${a.nome_completo || 'AAC'}`, html);
}

export async function imprimirCarteirinhaAssociado(a, operador = null, validacao = null) {
  const assinaturas = await carregarAssinaturasInstitucionais();
  const urlValidacao = urlConsultaPublica('associado', a.matricula || a.numero_ficha || a.id || '');
  const qr = await gerarQrCodeDataUrl(urlValidacao);
  const html = `<div class="print-actions"><button onclick="window.print()">Imprimir / salvar PDF</button></div>
  <main class="page landscape">
    <div class="page-inner">
      <h1 class="title">Carteirinha de Associado AAC</h1>
      <p class="subtitle">Imprima em papel firme, recorte e plastifique. Tamanho padrão tipo cartão.</p>
      <div class="cardsheet">
        <section class="card-print no-break">
          <div class="card-front">
            <img class="card-logo" src="/logo.png" alt="Logo AAC">
            <div class="small" style="margin-top:4px;color:#c8963e;font-weight:900">ASSOCIAÇÃO AMIGOS CARROCEIROS</div>
            <div class="card-name">${escapeHtml(a.nome_completo || 'Associado AAC')}</div>
            <div class="card-info">Matrícula/Ficha: <strong>${escapeHtml(a.matricula || a.numero_ficha || '-')}</strong><br>CPF: ${escapeHtml(a.cpf || '-')}<br>Categoria: ${escapeHtml(a.tipo_cadastro || '-')}<br>Status: ${escapeHtml(a.status || '-')}<br>Validade: enquanto associado ativo</div>
          </div>
          <div class="card-back">
            <img class="qr" src="${qr}" alt="QR Code">
            <div class="card-info">Use o QR Code para consulta pública oficial.<br><strong>AAC</strong><br>${escapeHtml(CNPJ_AAC)}</div>
          </div>
        </section>
        <section class="card-print no-break">
          <div class="card-back card-back-full" style="grid-column:1/-1">
            <div class="header" style="border:0;margin:0;padding:0"><img class="card-logo" src="/logo.png" alt="Logo AAC"><div><strong>AAC</strong><br><span class="small">Associação Amigos Carroceiros</span></div></div>
            <p class="card-info" style="font-size:10px">Esta carteira é de uso pessoal e institucional. Em caso de desligamento, suspensão ou exclusão do quadro social, o uso perde a validade.</p>
            <p class="card-info" style="font-size:10px"><strong>Contato:</strong> contato@amigoscarroceiros.org.br<br><strong>Sede:</strong> ${escapeHtml(SEDE_AAC)}</p>
            <div class="signatures card-signatures">
              ${assinaturaInstitucionalHtml(assinaturas.presidente, 'Presidente')}
              ${assinaturaInstitucionalHtml(assinaturas.secretaria, 'Secretaria')}
            </div>
          </div>
        </section>
      </div>
    </div>
  </main>`;

  abrirJanelaImpressao(`Carteirinha - ${a.nome_completo || 'AAC'}`, html);
}



export async function imprimirCarteirinhaAnimal(animal, operador = null, validacao = null) {
  const assinaturas = await carregarAssinaturasInstitucionais();
  const associado = animal.associados || {};
  const urlValidacao = urlConsultaPublica('rga', animal.rga || animal.id || '');
  const qr = await gerarQrCodeDataUrl(urlValidacao);
  const status = labelStatus(animal.status_rga);
  const condicao = labelStatus(animal.condicao_geral || animal.estado_fisico_status);
  const html = `<div class="print-actions"><button onclick="window.print()">Imprimir / salvar PDF</button></div>
  <main class="page landscape">
    <div class="page-inner">
      <h1 class="title">Carteirinha do Animal / RGA AAC</h1>
      <p class="subtitle">Identificação institucional do Registro Geral Animal. Imprima, recorte e plastifique.</p>
      <div class="cardsheet">
        <section class="card-print no-break">
          <div class="card-front">
            <img class="card-logo" src="/logo.png" alt="Logo AAC">
            <div class="small" style="margin-top:4px;color:#c8963e;font-weight:900">REGISTRO GERAL ANIMAL</div>
            <div class="card-name">${escapeHtml(animal.nome_animal || 'Animal AAC')}</div>
            <div class="card-info">RGA: <strong>${escapeHtml(animal.rga || '-')}</strong><br>Espécie: ${escapeHtml(animal.especie || 'Equino')}<br>Pelagem: ${escapeHtml(animal.cor_pelagem || '-')}<br>Sexo: ${escapeHtml(animal.sexo || '-')}<br>Status: ${escapeHtml(status)}<br>Condição: ${escapeHtml(condicao)}</div>
          </div>
          <div class="card-back">
            <img class="qr" src="${qr}" alt="QR Code">
            <div class="card-info">Consulta pública oficial do RGA.<br><strong>AAC</strong><br>${escapeHtml(CNPJ_AAC)}</div>
          </div>
        </section>
        <section class="card-print no-break">
          <div class="card-back card-back-full" style="grid-column:1/-1">
            <div class="header" style="border:0;margin:0;padding:0"><img class="card-logo" src="/logo.png" alt="Logo AAC"><div><strong>AAC</strong><br><span class="small">Associação Amigos Carroceiros</span></div></div>
            <p class="card-info" style="font-size:9.5px"><strong>Proprietário:</strong> ${escapeHtml(associado.nome_completo || '-')}<br><strong>Matrícula:</strong> ${escapeHtml(associado.matricula || associado.numero_ficha || '-')}</p>
            <p class="card-info" style="font-size:9.5px">A validade, situação e condição do RGA devem ser confirmadas pelo QR Code. Este documento não substitui laudo veterinário, guia oficial, exames obrigatórios ou documentos exigidos pelo Poder Público.</p>
            <div class="signatures card-signatures">
              ${assinaturaInstitucionalHtml(assinaturas.presidente, 'Presidente')}
              ${assinaturaInstitucionalHtml(assinaturas.bem_estar_animal, 'Bem-Estar Animal')}
            </div>
          </div>
        </section>
      </div>
      ${metaDocumento({ cadastradoPor: animal.cadastrado_por_nome || animal.atualizado_por_nome, emitidoPor: operador, extra: validacaoDocumentoHtml(validacao) })}
    </div>
  </main>`;
  abrirJanelaImpressao(`Carteirinha Animal - ${animal.rga || animal.nome_animal || 'AAC'}`, html);
}

export function imprimirCertidaoAssociado(associado, animais = [], mensalidades = [], operador = null, tipo = 'inteiro_teor', validacao = null) {
  const animaisRows = (animais || []).map((a, i) => `<tr><td>${i + 1}</td><td>${escapeHtml(a.rga || '-')}</td><td>${escapeHtml(a.nome_animal || '-')}</td><td>${escapeHtml(a.especie || 'Equino')}</td><td>${escapeHtml(a.cor_pelagem || '-')}</td><td>${escapeHtml(labelStatus(a.status_rga))}</td><td>${escapeHtml(labelStatus(a.condicao_geral || a.estado_fisico_status))}</td></tr>`).join('') || '<tr><td colspan="7">Nenhum animal/RGA vinculado encontrado.</td></tr>';
  const parcelasVencidas = (mensalidades || []).filter(m => ['vencida','atrasada'].includes(String(m.status || '').toLowerCase())).length;
  const totalPago = (mensalidades || []).filter(m => String(m.status || '').toLowerCase() === 'paga').reduce((acc, m) => acc + Number(m.valor_pago || m.valor || 0), 0);
  const totalAberto = (mensalidades || []).filter(m => String(m.status || '').toLowerCase() !== 'paga').reduce((acc, m) => acc + Number(m.valor || 0) + Number(m.juros || 0) - Number(m.desconto || 0), 0);
  const situacaoFinanceira = parcelasVencidas > 0 ? `Pendente (${parcelasVencidas} parcela(s) vencida(s))` : 'Sem parcelas vencidas identificadas';
  const titulo = tipo === 'regularidade' ? 'CERTIDÃO DE REGULARIDADE ASSOCIATIVA' : tipo === 'simples' ? 'CERTIDÃO CADASTRAL SIMPLES DO ASSOCIADO' : 'CERTIDÃO CADASTRAL DE INTEIRO TEOR DO ASSOCIADO';
  const incluirDadosSensiveis = tipo === 'inteiro_teor';

  const html = `<div class="print-actions"><button onclick="window.print()">Imprimir / salvar PDF</button></div>
  <main class="page">
    <div class="page-inner">
      <div class="header"><img class="logo" src="/logo.png" alt="Logo AAC"><div><div class="title">Associação Amigos Carroceiros (AAC)</div><div class="subtitle">CNPJ: ${CNPJ_AAC}<br>Sede Provisória: ${SEDE_AAC}</div></div></div>
      <div class="doc-title">${escapeHtml(titulo)}</div>
      <p class="terms">A Associação Amigos Carroceiros (AAC), para fins de controle interno e comprovação cadastral, certifica que constam nos registros da entidade as informações abaixo relativas ao associado indicado.</p>

      <div class="section-title">1. Identificação do associado</div>
      <table class="table"><tbody>
        <tr><th>Nome</th><td colspan="3"><strong>${escapeHtml(associado.nome_completo || '-')}</strong></td></tr>
        <tr><th>Matrícula</th><td>${escapeHtml(associado.matricula || '-')}</td><th>Nº da ficha</th><td>${escapeHtml(associado.numero_ficha || '-')}</td></tr>
        <tr><th>Data de admissão</th><td>${dateBR(associado.data_admissao)}</td><th>Status</th><td>${escapeHtml(labelStatus(associado.status))}</td></tr>
        <tr><th>Tipo</th><td>${escapeHtml(associado.tipo_cadastro || '-')}</td><th>CPF</th><td>${incluirDadosSensiveis ? escapeHtml(associado.cpf || '-') : escapeHtml(mascararCpf(associado.cpf))}</td></tr>
        ${incluirDadosSensiveis ? `<tr><th>RG</th><td>${escapeHtml(associado.rg || '-')}</td><th>Órgão/UF</th><td>${escapeHtml(associado.orgao_emissor_uf || '-')}</td></tr><tr><th>Contato</th><td>${escapeHtml(associado.telefone_whatsapp || '-')}</td><th>E-mail</th><td>${escapeHtml(associado.email || '-')}</td></tr><tr><th>Endereço</th><td colspan="3">${escapeHtml(enderecoAssociado(associado) || associado.endereco_residencial || '-')}</td></tr>` : ''}
      </tbody></table>

      <div class="section-title">2. Situação associativa e financeira</div>
      <table class="table"><tbody>
        <tr><th>Situação cadastral</th><td>${escapeHtml(labelStatus(associado.status))}</td><th>Financeiro</th><td>${escapeHtml(situacaoFinanceira)}</td></tr>
        <tr><th>Mensalidades registradas</th><td>${mensalidades.length}</td><th>Total pago registrado</th><td>${money(totalPago)}</td></tr>
        <tr><th>Total em aberto estimado</th><td>${money(totalAberto)}</td><th>Parcelas vencidas</th><td>${parcelasVencidas}</td></tr>
      </tbody></table>

      <div class="section-title">3. Animais / RGA vinculados</div>
      <table class="table"><thead><tr><th>Nº</th><th>RGA</th><th>Animal</th><th>Espécie</th><th>Pelagem</th><th>Status</th><th>Condição</th></tr></thead><tbody>${animaisRows}</tbody></table>

      ${incluirDadosSensiveis ? `<div class="section-title">4. Observações cadastrais</div><p class="terms">${escapeHtml(associado.observacoes || 'Sem observações administrativas registradas.')}</p>` : ''}
      <p class="terms" style="margin-top:12px">Esta certidão é emitida com base nos registros internos da AAC e não possui natureza de certidão cartorial. Para confirmação pública de associado ou RGA, utilize os QR Codes e páginas oficiais de consulta pública quando disponíveis.</p>
      ${metaDocumento({ cadastradoPor: associado.cadastrado_por_nome || associado.atualizado_por_nome, emitidoPor: operador, extra: `Tipo de certidão: ${escapeHtml(tipo)}${validacaoDocumentoHtml(validacao) ? '<br>' + validacaoDocumentoHtml(validacao) : ''}` })}
      <div class="signatures" style="margin-top:28mm"><div class="signature">Secretaria da AAC</div><div class="signature">Presidência / Diretoria Executiva</div></div>
    </div>
  </main>`;
  abrirJanelaImpressao(`${titulo} - ${associado.nome_completo || 'AAC'}`, html);
}


async function fichaRGABody(animal, operador = null, validacaoDoc = null) {
  const associado = animal.associados || {};
  const validacao = urlConsultaPublica('rga', animal.rga || animal.id || '');
  const qr = await gerarQrCodeDataUrl(validacao);
  const ano = new Date().getFullYear();

  return `<main class="page rga-page rga-page-1">
    <div class="page-inner">
      <div class="header">
        <img class="logo" src="/logo.png" alt="Logo AAC">
        <div>
          <div class="title">Ficha de Controle – RGA Nº: ${valorOuLinha(animal.rga, 12)} / ${ano}</div>
          <div class="subtitle">Associação Amigos Carroceiros (AAC) • CNPJ: ${CNPJ_AAC}</div>
        </div>
        <img class="qr" src="${qr}" alt="QR Code" style="margin-left:auto;width:18mm;height:18mm">
      </div>

      <div class="section-title">1. Dados do Proprietário (Associado)</div>
      <table class="table">
        <tbody>
          <tr><td>Nome: <strong>${valorOuLinha(associado.nome_completo, 40)}</strong></td><td>Matrícula: <strong>${valorOuLinha(associado.matricula || associado.numero_ficha, 12)}</strong></td></tr>
          <tr><td>Telefone: <strong>${valorOuLinha(associado.telefone_whatsapp, 20)}</strong></td><td>CPF: <strong>${valorOuLinha(associado.cpf, 18)}</strong></td></tr>
          <tr><td colspan="2">Endereço: <strong>${valorOuLinha(enderecoAssociado(associado), 82)}</strong></td></tr>
        </tbody>
      </table>

      <div class="section-title">2. Identificação do Animal</div>
      <table class="table">
        <tbody>
          <tr><td>Nome do Animal: <strong>${valorOuLinha(animal.nome_animal, 32)}</strong></td><td>Espécie/Raça: <strong>${valorOuLinha(`${animal.especie || 'Equino'} ${animal.raca ? '• ' + animal.raca : ''}`, 24)}</strong></td></tr>
          <tr><td>Pelagem (Cor): <strong>${valorOuLinha(animal.cor_pelagem, 28)}</strong></td><td>Sexo/Idade: <strong>${valorOuLinha(`${animal.sexo || '-'} • ${animal.idade_estimada || '-'}`, 20)}</strong></td></tr>
          <tr><td colspan="2">Marcas Específicas: <strong>${valorOuLinha(animal.marcas_especificas, 80)}</strong></td></tr>
          <tr><td>Finalidade de uso: <strong>${valorOuLinha(animal.finalidade_uso, 25)}</strong></td><td>Condição geral: <strong>${valorOuLinha(labelStatus(animal.condicao_geral || animal.estado_fisico_status), 20)}</strong></td></tr>
        </tbody>
      </table>

      <div class="section-title">3. Resenha gráfica <span class="small">(para marcar cicatrizes ou manchas)</span></div>
      <img class="rga-resenha" src="/resenha-equino.png" alt="Resenha gráfica equina">
    </div>
  </main>

  <main class="page rga-page rga-page-2">
    <div class="page-inner">
      <div class="header">
        <img class="logo" src="/logo.png" alt="Logo AAC">
        <div>
          <div class="title">Ficha de Controle – RGA Nº: ${valorOuLinha(animal.rga, 12)} / ${ano}</div>
          <div class="subtitle">Controle sanitário e responsabilidade</div>
        </div>
      </div>

      <div class="section-title">4. Controle Sanitário (Uso Exclusivo da Diretoria)</div>
      <table class="table">
        <thead><tr><th>Item avaliado</th><th>Situação</th><th>Data</th><th>Visto veterinário</th></tr></thead>
        <tbody>
          <tr><td>Exame AIE (Anemia)</td><td>[ ${checked(animal.exame_aie_status === 'negativo')} ] NEGATIVO<br>[ ${checked(animal.exame_aie_status === 'positivo')} ] POSITIVO</td><td>${valorOuLinha(dateBR(animal.data_vistoria), 10)}</td><td>${valorOuLinha(animal.visto_veterinario, 20)}</td></tr>
          <tr><td>Exame Mormo</td><td>[ ${checked(animal.exame_mormo_status === 'negativo')} ] NEGATIVO<br>[ ${checked(animal.exame_mormo_status === 'positivo')} ] POSITIVO</td><td></td><td></td></tr>
          <tr><td>Vacinas</td><td>[ ${checked(animal.vacinas_status === 'em_dia')} ] EM DIA<br>[ ${checked(animal.vacinas_status === 'pendente')} ] PENDENTE</td><td></td><td></td></tr>
          <tr><td>Estado Físico Geral</td><td>[ ${checked(animal.estado_fisico_status === 'apto')} ] APTO<br>[ ${checked(animal.estado_fisico_status === 'inapto')} ] INAPTO</td><td></td><td></td></tr>
          <tr><td>Cascos/Ferraduras</td><td>[ ${checked(animal.cascos_status === 'bom')} ] BOM<br>[ ${checked(animal.cascos_status === 'ruim')} ] RUIM</td><td></td><td></td></tr>
        </tbody>
      </table>

      <p class="responsabilidade"><strong>TERMO DE RESPONSABILIDADE</strong> Declaro serem verdadeiras as informações acima e comprometo-me a manter este animal sob os cuidados exigidos pelo Estatuto da AAC, sob pena de perder o registro.</p>
      <p class="terms">São Francisco do Sul, ____ de ______________ de 20____.</p>
      ${metaDocumento({ cadastradoPor: animal.cadastrado_por_nome || animal.atualizado_por_nome, emitidoPor: operador, extra: validacaoDocumentoHtml(validacaoDoc) })}
      <div class="signatures">
        <div class="signature">Assinatura do Associado</div>
        <div class="signature">Diretoria de Bem-Estar Animal / Veterinário</div>
      </div>
    </div>
  </main>`;
}

export async function htmlFichaRGAAssinavel(animal, operador = null, validacaoDoc = null) {
  return `${estilosImpressao()}${await fichaRGABody(animal, operador, validacaoDoc)}`;
}

export async function imprimirFichaRGA(animal, operador = null, validacaoDoc = null) {
  const html = `<div class="print-actions"><button onclick="window.print()">Imprimir / salvar PDF</button></div>${await fichaRGABody(animal, operador, validacaoDoc)}`;

  abrirJanelaImpressao(`Ficha RGA - ${animal.rga || animal.nome_animal || 'AAC'}`, html);
}


export async function imprimirProntuarioAnimal(animal, vistorias = [], controles = [], fotos = {}, operador = null, validacaoDoc = null) {
  const associado = animal.associados || {};
  const validacao = urlConsultaPublica('rga', animal.rga || animal.id || '');
  const qr = await gerarQrCodeDataUrl(validacao);
  const alertas = [
    alertaValidade('Exame AIE', animal.exame_aie_validade),
    alertaValidade('Exame Mormo', animal.exame_mormo_validade),
    alertaValidade('Vacinas', animal.vacinas_validade),
    alertaValidade('Vermifugação', animal.vermifugacao_validade),
    alertaValidade('Próxima vistoria', animal.proxima_vistoria)
  ];

  const fotosHtml = [
    fotoBloco(fotos.foto_lateral_esquerda_path, 'Lateral esquerda'),
    fotoBloco(fotos.foto_lateral_direita_path, 'Lateral direita'),
    fotoBloco(fotos.foto_frontal_path, 'Frontal'),
    fotoBloco(fotos.foto_traseira_path, 'Traseira'),
    fotoBloco(fotos.foto_marcas_path, 'Marcas específicas'),
    fotoBloco(fotos.foto_carroca_path, 'Carroça / conjunto')
  ].join('') || '<p class="muted">Nenhuma foto anexada ao prontuário.</p>';

  const vistoriasRows = (vistorias || []).slice(0, 12).map(v => `
    <tr>
      <td>${dateBR(v.data_vistoria)}</td>
      <td>${escapeHtml(v.responsavel || '-')}</td>
      <td>${escapeHtml(labelStatus(v.resultado))}</td>
      <td>${escapeHtml(labelStatus(v.estado_fisico))}</td>
      <td>${escapeHtml(labelStatus(v.cascos_ferraduras))}</td>
      <td>${dateBR(v.proxima_vistoria)}</td>
      <td>${escapeHtml(v.observacoes || '-')}</td>
    </tr>
  `).join('') || '<tr><td colspan="7">Nenhuma vistoria registrada.</td></tr>';

  const controlesRows = (controles || []).slice(0, 16).map(c => `
    <tr>
      <td>${dateBR(c.data_registro)}</td>
      <td>${escapeHtml(c.tipo || '-')}</td>
      <td>${escapeHtml(c.descricao || '-')}</td>
      <td>${escapeHtml(labelStatus(c.situacao))}</td>
      <td>${dateBR(c.validade)}</td>
      <td>${escapeHtml(c.responsavel || '-')}</td>
      <td>${escapeHtml(c.observacoes || '-')}</td>
    </tr>
  `).join('') || '<tr><td colspan="7">Nenhum registro sanitário cadastrado.</td></tr>';

  const html = `<div class="print-actions"><button onclick="window.print()">Imprimir / salvar PDF</button></div>
  <main class="page prontuario-page">
    <div class="page-inner">
      <div class="header">
        <img class="logo" src="/logo.png" alt="Logo AAC">
        <div>
          <div class="title">Prontuário do Animal / RGA</div>
          <div class="subtitle">Associação Amigos Carroceiros (AAC) • CNPJ: ${CNPJ_AAC}</div>
        </div>
        <img class="qr" src="${qr}" alt="QR Code" style="margin-left:auto;width:18mm;height:18mm">
      </div>

      <div class="section-title">1. Identificação e vínculo</div>
      <table class="table">
        <tbody>
          <tr><td>RGA: <strong>${valorOuLinha(animal.rga, 18)}</strong></td><td>Animal: <strong>${valorOuLinha(animal.nome_animal, 30)}</strong></td><td>Status: <strong>${escapeHtml(labelStatus(animal.status_rga))}</strong></td></tr>
          <tr><td>Espécie/Raça: <strong>${valorOuLinha(`${animal.especie || 'Equino'} ${animal.raca ? '• ' + animal.raca : ''}`, 24)}</strong></td><td>Sexo/Idade: <strong>${valorOuLinha(`${animal.sexo || '-'} • ${animal.idade_estimada || '-'}`, 18)}</strong></td><td>Pelagem: <strong>${valorOuLinha(animal.cor_pelagem, 18)}</strong></td></tr>
          <tr><td colspan="2">Proprietário: <strong>${valorOuLinha(associado.nome_completo, 55)}</strong></td><td>Matrícula: <strong>${valorOuLinha(associado.matricula || associado.numero_ficha, 12)}</strong></td></tr>
          <tr><td colspan="3">Marcas específicas: <strong>${valorOuLinha(animal.marcas_especificas, 90)}</strong></td></tr>
          <tr><td>Condição geral: <strong>${escapeHtml(labelStatus(animal.condicao_geral || animal.estado_fisico_status))}</strong></td><td>Última vistoria: <strong>${dateBR(animal.data_vistoria)}</strong></td><td>Próxima vistoria: <strong>${dateBR(animal.proxima_vistoria)}</strong></td></tr>
        </tbody>
      </table>

      <div class="section-title">2. Alertas administrativos e sanitários</div>
      ${alertas.map(a => `<div class="alerta">${escapeHtml(a)}</div>`).join('')}

      <div class="section-title">3. Controle sanitário resumido</div>
      <table class="table">
        <tbody>
          <tr><td>AIE: <strong>${escapeHtml(labelStatus(animal.exame_aie_status))}</strong></td><td>Data: ${dateBR(animal.exame_aie_data)}</td><td>Validade: ${dateBR(animal.exame_aie_validade)}</td></tr>
          <tr><td>Mormo: <strong>${escapeHtml(labelStatus(animal.exame_mormo_status))}</strong></td><td>Data: ${dateBR(animal.exame_mormo_data)}</td><td>Validade: ${dateBR(animal.exame_mormo_validade)}</td></tr>
          <tr><td>Vacinas: <strong>${escapeHtml(labelStatus(animal.vacinas_status))}</strong></td><td>Data: ${dateBR(animal.vacinas_data)}</td><td>Validade: ${dateBR(animal.vacinas_validade)}</td></tr>
          <tr><td>Vermifugação</td><td>Data: ${dateBR(animal.vermifugacao_data)}</td><td>Validade: ${dateBR(animal.vermifugacao_validade)}</td></tr>
        </tbody>
      </table>

      <div class="section-title">4. Fotos anexadas ao prontuário</div>
      <div class="foto-grid">${fotosHtml}</div>
    </div>
  </main>

  <main class="page prontuario-page">
    <div class="page-inner">
      <div class="header">
        <img class="logo" src="/logo.png" alt="Logo AAC">
        <div><div class="title">Histórico de vistorias e registros sanitários</div><div class="subtitle">RGA: ${valorOuLinha(animal.rga, 12)} • Animal: ${valorOuLinha(animal.nome_animal, 24)}</div></div>
      </div>

      <div class="section-title">5. Histórico de vistorias</div>
      <table class="table">
        <thead><tr><th>Data</th><th>Responsável</th><th>Resultado</th><th>Estado físico</th><th>Cascos</th><th>Próxima</th><th>Observações</th></tr></thead>
        <tbody>${vistoriasRows}</tbody>
      </table>

      <div class="section-title">6. Histórico sanitário</div>
      <table class="table">
        <thead><tr><th>Data</th><th>Tipo</th><th>Descrição</th><th>Situação</th><th>Validade</th><th>Responsável</th><th>Observações</th></tr></thead>
        <tbody>${controlesRows}</tbody>
      </table>

      <div class="section-title">7. Observações gerais</div>
      <p class="terms">${escapeHtml(animal.observacoes_veterinarias || 'Sem observações adicionais registradas.')}</p>
      ${metaDocumento({ cadastradoPor: animal.cadastrado_por_nome || animal.atualizado_por_nome, emitidoPor: operador, extra: validacaoDocumentoHtml(validacaoDoc) })}
      <div class="signatures" style="margin-top:22mm">
        <div class="signature">Diretoria de Bem-Estar Animal</div>
        <div class="signature">Presidência / Secretaria</div>
      </div>
    </div>
  </main>`;

  abrirJanelaImpressao(`Prontuário RGA - ${animal.rga || animal.nome_animal || 'AAC'}`, html);
}



export function imprimirAta(ata, operador = null, validacao = null) {
  const presentes = String(ata.presentes || '').split('\n').map(p => p.trim()).filter(Boolean);
  const presentesRows = presentes.map((p, i) => `<tr><td>${i + 1}</td><td>${escapeHtml(p)}</td><td></td></tr>`).join('') || '<tr><td colspan="3">Sem lista de presentes preenchida.</td></tr>';
  const html = `<div class="print-actions"><button onclick="window.print()">Imprimir / salvar PDF</button></div>
  <main class="page">
    <div class="page-inner">
      <div class="header"><img class="logo" src="/logo.png" alt="Logo AAC"><div><div class="title">Associação Amigos Carroceiros (AAC)</div><div class="subtitle">CNPJ: ${CNPJ_AAC}<br>Sede Provisória: ${SEDE_AAC}</div></div></div>
      <div class="doc-title">${escapeHtml(ata.tipo || 'ATA')} — ${escapeHtml(ata.titulo || 'Reunião')}</div>
      <table class="table"><tbody>
        <tr><th>Data</th><td>${dateBR(ata.data_reuniao)}</td><th>Horário</th><td>${escapeHtml(ata.horario || '-')}</td></tr>
        <tr><th>Local</th><td colspan="3">${escapeHtml(ata.local || '-')}</td></tr>
        <tr><th>Presidência</th><td>${escapeHtml(ata.presidencia || '-')}</td><th>Secretaria</th><td>${escapeHtml(ata.secretaria || '-')}</td></tr>
      </tbody></table>
      <div class="section-title">Pauta</div><p class="terms">${escapeHtml(ata.pauta || '-')}</p>
      <div class="section-title">Deliberações e encaminhamentos</div><p class="terms">${escapeHtml(ata.deliberacoes || '-').replaceAll('\n','<br>')}</p>
      <div class="section-title">Observações</div><p class="terms">${escapeHtml(ata.observacoes || '-').replaceAll('\n','<br>')}</p>
      <div class="section-title">Lista resumida de presença</div>
      <table class="table"><thead><tr><th style="width:12%">Nº</th><th>Nome</th><th style="width:32%">Assinatura</th></tr></thead><tbody>${presentesRows}</tbody></table>
      ${metaDocumento({ cadastradoPor: ata.cadastrado_por_nome, emitidoPor: operador, extra: validacaoDocumentoHtml(validacao) })}
      <div class="signatures"><div class="signature">Presidência da reunião</div><div class="signature">Secretaria da reunião</div></div>
    </div>
  </main>`;
  abrirJanelaImpressao(`Ata AAC - ${ata.titulo || ata.tipo || 'reuniao'}`, html);
}

export function imprimirListaPresenca(ata, operador = null, validacao = null) {
  const linhas = Array.from({ length: 24 }, (_, i) => `<tr><td>${i + 1}</td><td></td><td></td><td></td></tr>`).join('');
  const html = `<div class="print-actions"><button onclick="window.print()">Imprimir / salvar PDF</button></div>
  <main class="page">
    <div class="page-inner">
      <div class="header"><img class="logo" src="/logo.png" alt="Logo AAC"><div><div class="title">Lista de Presença — AAC</div><div class="subtitle">CNPJ: ${CNPJ_AAC}<br>${escapeHtml(ata.titulo || ata.tipo || 'Reunião')}</div></div></div>
      <table class="table"><tbody><tr><th>Data</th><td>${dateBR(ata.data_reuniao)}</td><th>Local</th><td>${escapeHtml(ata.local || '-')}</td></tr><tr><th>Pauta</th><td colspan="3">${escapeHtml(ata.pauta || '-')}</td></tr></tbody></table>
      <div class="section-title">Assinaturas dos presentes</div>
      <table class="table"><thead><tr><th style="width:10%">Nº</th><th>Nome completo</th><th style="width:25%">CPF/Matrícula</th><th style="width:30%">Assinatura</th></tr></thead><tbody>${linhas}</tbody></table>
      ${metaDocumento({ cadastradoPor: ata.cadastrado_por_nome, emitidoPor: operador, extra: validacaoDocumentoHtml(validacao) })}
    </div>
  </main>`;
  abrirJanelaImpressao(`Lista de presença AAC - ${ata.titulo || 'reuniao'}`, html);
}

export function imprimirRelatorioProtocolos(protocolos = [], operador = null, validacao = null) {
  const rows = protocolos.map(p => `<tr><td>${dateBR(p.data_envio)}</td><td>${escapeHtml(p.orgao || '-')}</td><td>${escapeHtml(p.numero_protocolo || '-')}</td><td>${escapeHtml(p.assunto || '-')}</td><td>${escapeHtml(p.responsavel || '-')}</td><td>${dateBR(p.prazo_resposta)}</td><td>${escapeHtml(p.status || '-')}</td></tr>`).join('') || '<tr><td colspan="7">Nenhum protocolo cadastrado.</td></tr>';
  const html = `<div class="print-actions"><button onclick="window.print()">Imprimir / salvar PDF</button></div>
  <main class="page">
    <div class="page-inner">
      <div class="header"><img class="logo" src="/logo.png" alt="Logo AAC"><div><div class="title">Relatório de Protocolos — AAC</div><div class="subtitle">Controle de documentos enviados a órgãos públicos, parceiros e instituições</div></div></div>
      <table class="table"><thead><tr><th>Envio</th><th>Órgão</th><th>Protocolo</th><th>Assunto</th><th>Responsável</th><th>Prazo</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table>
      ${metaDocumento({ emitidoPor: operador, extra: validacaoDocumentoHtml(validacao) })}
      <div class="signatures"><div class="signature">Secretaria</div><div class="signature">Presidência</div></div>
    </div>
  </main>`;
  abrirJanelaImpressao('Relatório de protocolos AAC', html);
}

export function imprimirReciboMensalidade(mensalidade, validacao = null) {
  const associado = mensalidade.associados || {};
  const valorBase = Number(mensalidade.valor || 0);
  const juros = Number(mensalidade.juros || 0);
  const desconto = Number(mensalidade.desconto || 0);
  const valorTotal = Number(mensalidade.valor_pago || (valorBase + juros - desconto));
  const numeroRecibo = mensalidade.numero_recibo || `AAC-REC-${String(mensalidade.competencia || '').replace('-', '')}-${String(mensalidade.id || '').slice(0, 8).toUpperCase()}`;
  const dataPagamento = mensalidade.data_pagamento || new Date().toISOString().slice(0, 10);
  const html = `<div class="print-actions"><button onclick="window.print()">Imprimir / salvar PDF</button></div>
  <main class="page recibo-page">
    <div class="page-inner">
      <div class="header">
        <img class="logo" src="/logo.png" alt="Logo AAC">
        <div>
          <div class="title">Associação Amigos Carroceiros (AAC)</div>
          <div class="subtitle">CNPJ: ${CNPJ_AAC}<br>Sede Provisória: ${SEDE_AAC}</div>
        </div>
      </div>

      <div class="doc-title">RECIBO DE CONTRIBUIÇÃO ASSOCIATIVA</div>

      <div class="notice"><strong>Nº do recibo:</strong> ${escapeHtml(numeroRecibo)}<br>${validacaoDocumentoHtml(validacao) ? validacaoDocumentoHtml(validacao) + '<br>' : ''}<strong>Competência:</strong> ${escapeHtml(mensalidade.competencia || '-')}<br><strong>Data do pagamento:</strong> ${dateBR(dataPagamento)}</div>

      <p class="terms" style="font-size:13px;line-height:1.55;margin-top:18px">
        Recebemos de <strong>${escapeHtml(associado.nome_completo || '-')}</strong>,
        matrícula/ficha <strong>${escapeHtml(associado.matricula || associado.numero_ficha || '-')}</strong>,
        a importância de <strong>${money(valorTotal)}</strong>, referente à contribuição associativa mensal da Associação Amigos Carroceiros (AAC), competência <strong>${escapeHtml(mensalidade.competencia || '-')}</strong>.
      </p>

      <table class="table" style="font-size:12px;margin-top:18px">
        <tbody>
          <tr><th>Valor da mensalidade</th><td>${money(valorBase)}</td></tr>
          <tr><th>Juros</th><td>${money(juros)}</td></tr>
          <tr><th>Desconto/abatimento</th><td>${money(desconto)}</td></tr>
          <tr><th>Valor recebido</th><td><strong>${money(valorTotal)}</strong></td></tr>
          <tr><th>Forma de pagamento</th><td>${escapeHtml(mensalidade.forma_pagamento || '-')}</td></tr>
          <tr><th>Recebido por</th><td>${escapeHtml(mensalidade.recebido_por || 'Tesouraria AAC')}</td></tr>
          <tr><th>Observações</th><td>${escapeHtml(mensalidade.observacoes_quitacao || mensalidade.observacoes || '-')}</td></tr>
        </tbody>
      </table>

      <p class="terms" style="margin-top:18px">São Francisco do Sul/SC, ${dataPorExtenso(dataPagamento)}.</p>
      <div class="signatures" style="margin-top:34mm">
        <div class="signature">Tesouraria da AAC</div>
        <div class="signature">Associado / Recebedor</div>
      </div>
    </div>
  </main>`;
  abrirJanelaImpressao(`Recibo AAC - ${associado.nome_completo || mensalidade.competencia || 'mensalidade'}`, html);
}

export function imprimirRelatorioInadimplencia({ titulo, itens = [], dataReferencia = new Date() }) {
  const rows = itens.map(item => `<tr><td>${escapeHtml(item.associado || '-')}</td><td>${escapeHtml(item.matricula || '-')}</td><td>${item.parcelasVencidas}</td><td>${money(item.valorVencido)}</td><td>${dateBR(item.ultimoVencimento)}</td><td>${item.parcelasVencidas >= 3 ? 'Risco de exclusão estatutária' : 'Pendência financeira'}</td></tr>`).join('');
  const totalVencido = itens.reduce((acc, item) => acc + Number(item.valorVencido || 0), 0);
  const totalCritico = itens.filter(item => item.parcelasVencidas >= 3).length;
  const html = `<div class="print-actions"><button onclick="window.print()">Imprimir / salvar PDF</button></div>
  <main class="page">
    <div class="page-inner">
      <div class="header"><img class="logo" src="/logo.png" alt="Logo AAC"><div><div class="title">${escapeHtml(titulo || 'Relatório de Inadimplência')}</div><div class="subtitle">Data de referência: ${dateBR(dataReferencia)} • CNPJ: ${CNPJ_AAC}</div></div></div>
      <div class="two-col"><div class="notice"><strong>Associados com pendência:</strong> ${itens.length}<br><strong>Casos críticos 3+ parcelas:</strong> ${totalCritico}</div><div class="notice"><strong>Total vencido estimado:</strong> ${money(totalVencido)}<br><strong>Regra:</strong> exclusão automática após 3 parcelas vencidas, conforme declaração de ciência.</div></div>
      <div class="section-title">Lista de associados com mensalidades vencidas</div>
      <table class="table"><thead><tr><th>Associado</th><th>Matrícula</th><th>Parcelas vencidas</th><th>Valor vencido</th><th>Último vencimento</th><th>Situação</th></tr></thead><tbody>${rows || '<tr><td colspan="6">Nenhuma pendência encontrada.</td></tr>'}</tbody></table>
      <div class="signatures"><div class="signature">Tesouraria</div><div class="signature">Conselho Fiscal</div></div>
    </div>
  </main>`;
  abrirJanelaImpressao(titulo || 'Relatório de Inadimplência AAC', html);
}

export function imprimirRelatorioFinanceiro({ titulo, periodo, financeiro = [], mensalidades = [], totais = {} }) {
  const rowsFin = financeiro.map(f => `<tr><td>${dateBR(f.data_movimento)}</td><td>${escapeHtml(f.tipo)}</td><td>${escapeHtml(f.categoria || '-')}</td><td>${escapeHtml(f.descricao || '-')}</td><td>${money(f.valor)}</td></tr>`).join('');
  const rowsMensal = mensalidades.map(m => `<tr><td>${escapeHtml(m.associados?.nome_completo || '-')}</td><td>${escapeHtml(m.competencia || '-')}</td><td>${dateBR(m.data_vencimento)}</td><td>${escapeHtml(m.status || '-')}</td><td>${money(Number(m.valor || 0) + Number(m.juros || 0))}</td><td>${money(m.valor_pago || 0)}</td></tr>`).join('');
  const html = `<div class="print-actions"><button onclick="window.print()">Imprimir / salvar PDF</button></div>
  <main class="page">
    <div class="page-inner">
      <div class="header"><img class="logo" src="/logo.png" alt="Logo AAC"><div><div class="title">${escapeHtml(titulo || 'Relatório Financeiro AAC')}</div><div class="subtitle">Período: ${escapeHtml(periodo || '-')} • CNPJ: ${CNPJ_AAC}</div></div></div>
      <div class="two-col"><div class="notice"><strong>Entradas:</strong> ${money(totais.entradas || 0)}<br><strong>Saídas:</strong> ${money(totais.saidas || 0)}<br><strong>Saldo:</strong> ${money(totais.saldo || 0)}</div><div class="notice"><strong>Mensalidades em aberto/atraso:</strong> ${money(totais.mensalidadesAbertas || 0)}<br><strong>Mensalidades pagas:</strong> ${money(totais.mensalidadesPagas || 0)}</div></div>
      <div class="section-title">Lançamentos financeiros</div><table class="table"><thead><tr><th>Data</th><th>Tipo</th><th>Categoria</th><th>Descrição</th><th>Valor</th></tr></thead><tbody>${rowsFin || '<tr><td colspan="5">Sem lançamentos no período.</td></tr>'}</tbody></table>
      <div class="section-title">Mensalidades</div><table class="table"><thead><tr><th>Associado</th><th>Competência</th><th>Vencimento</th><th>Status</th><th>Valor devido</th><th>Valor pago</th></tr></thead><tbody>${rowsMensal || '<tr><td colspan="6">Sem mensalidades no período.</td></tr>'}</tbody></table>
      <div class="signatures"><div class="signature">Tesouraria</div><div class="signature">Conselho Fiscal</div></div>
    </div>
  </main>`;
  abrirJanelaImpressao(titulo || 'Relatório Financeiro AAC', html);
}

function mesLabelPrint(mes) {
  if (!mes) return '-';
  const [ano, m] = String(mes).split('-').map(Number);
  if (!ano || !m) return escapeHtml(mes);
  return new Date(ano, m - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
}

function percentBR(value) {
  return `${Number(value || 0).toLocaleString('pt-BR', { maximumFractionDigits: 4 })}%`;
}

export async function imprimirPlanejamentoFinanceiro(plano, calculo = {}, operador = null, validacao = null) {
  const url = validacao?.url_validacao || (validacao?.codigo_validacao ? `${baseConsultaPublica()}/validar/${encodeURIComponent(validacao.codigo_validacao)}` : '');
  const qr = url ? await gerarQrCodeDataUrl(url) : '';
  const fundosRows = (calculo.fundos || []).map(f => `<tr><td>${escapeHtml(f.nome)}</td><td>${percentBR(f.percentual)}</td><td>${money(calculo.totaisFundos?.[f.nome] || 0)}</td></tr>`).join('');
  const receitasRows = (calculo.receitas || []).map(r => `<tr><td>${escapeHtml(r.descricao)}</td><td>${r.recorrente ? 'Recorrente mensal' : 'Esporádica'}</td><td>${r.recorrente ? `${r.qtd} mês(es)` : mesLabelPrint(r.mes_alvo)}</td><td>${money(r.bruto)}</td><td>${escapeHtml(r.regra_distribuicao === 'igual' ? 'Divisão igualitária' : r.regra_distribuicao === 'fundo_especifico' ? 'Fundo específico' : 'Percentuais dos fundos')}</td></tr>`).join('');
  const mesesRows = (calculo.mesesResumo || []).map(m => {
    const acumulado = Object.entries(m.acumulado_fundos || {}).map(([nome, valor]) => `<div><strong>${escapeHtml(nome)}:</strong> ${money(valor)}</div>`).join('');
    const extras = (m.receitas_extras || []).length ? (m.receitas_extras || []).map(r => `${escapeHtml(r.descricao)}: ${money(r.valor)}`).join('<br>') : 'R$ 0,00';
    return `<tr><td><strong>${escapeHtml(m.label)}</strong></td><td>${m.associados} associado(s)<br>${money(m.bruto_mensalidades)} bruto<br>${money(m.taxas_mensalidades)} taxas<br><strong>${money(m.liquido_mensalidades)} líquido</strong></td><td>${extras}</td><td><strong>${money(m.total_mes)}</strong></td><td>${acumulado}</td></tr>`;
  }).join('');

  const html = `<div class="print-actions"><button onclick="window.print()">Imprimir / salvar PDF</button></div>
  <main class="page">
    <div class="page-inner">
      <div class="header">
        <img class="logo" src="/logo.png" alt="Logo AAC">
        <div>
          <div class="title">Associação Amigos Carroceiros (AAC)</div>
          <div class="subtitle">CNPJ: ${CNPJ_AAC}<br>Sede Provisória: ${SEDE_AAC}</div>
        </div>
        ${qr ? `<img class="qr" src="${qr}" alt="QR Code" style="margin-left:auto;width:20mm;height:20mm">` : ''}
      </div>

      <div class="doc-title">PLANEJAMENTO ORÇAMENTÁRIO SIMPLIFICADO</div>
      <div class="notice">
        <strong>${escapeHtml(plano.titulo || 'Planejamento Financeiro')}</strong><br>
        <strong>Período:</strong> ${mesLabelPrint(plano.mes_inicio)} a ${mesLabelPrint(plano.mes_fim)}<br>
        <strong>Associados ativos/pagantes previstos:</strong> ${Number(calculo.associadosPrevistos || plano.associados_previstos || 0)}<br>
        <strong>Mensalidade padrão:</strong> ${money(calculo.valorMensalidade || plano.valor_mensalidade || 25)} • <strong>Taxa boleto por mensalidade:</strong> ${money(calculo.taxaMensalidade || plano.taxa_operacional || 0)}
        ${validacaoDocumentoHtml(validacao) ? `<br>${validacaoDocumentoHtml(validacao)}` : ''}
      </div>

      <div class="section-title">1. Regras de distribuição por fundos</div>
      <table class="table"><thead><tr><th>Fundo</th><th>Percentual</th><th>Acumulado previsto</th></tr></thead><tbody>${fundosRows || '<tr><td colspan="3">Nenhum fundo informado.</td></tr>'}</tbody></table>

      <div class="section-title">2. Planejamento mês a mês</div>
      <table class="table"><thead><tr><th>Mês</th><th>Mensalidades</th><th>Entradas extras</th><th>Total do mês</th><th>Acumulado nos fundos</th></tr></thead><tbody>${mesesRows || '<tr><td colspan="5">Sem meses no período.</td></tr>'}</tbody></table>

      <div class="section-title">3. Receitas extras esperadas</div>
      <table class="table"><thead><tr><th>Descrição</th><th>Tipo</th><th>Ocorrências</th><th>Valor previsto</th><th>Regra</th></tr></thead><tbody>${receitasRows || '<tr><td colspan="5">Nenhuma receita extra cadastrada.</td></tr>'}</tbody></table>

      <div class="two-col no-break" style="margin-top:8px">
        <div class="notice"><strong>Total bruto previsto:</strong> ${money(calculo.totalBruto || 0)}<br><strong>Taxas de boleto previstas:</strong> ${money(calculo.totalTaxas || 0)}</div>
        <div class="notice"><strong>Total líquido/distribuível:</strong> ${money(calculo.totalLiquido || 0)}<br><strong>Entradas extras previstas:</strong> ${money(calculo.totalExtras || 0)}</div>
      </div>

      <div class="section-title">4. Critério técnico de apuração</div>
      <p class="terms">As taxas operacionais são consideradas somente sobre mensalidades de associados pagas por boleto/Asaas. Receitas extras não sofrem desconto automático de taxa, salvo registro financeiro próprio. As mensalidades líquidas são distribuídas entre todos os fundos conforme os percentuais aprovados neste planejamento.</p>
      ${plano.observacoes ? `<p class="terms"><strong>Observações:</strong> ${escapeHtml(plano.observacoes)}</p>` : ''}
      ${metaDocumento({ cadastradoPor: plano.cadastrado_por_nome || plano.atualizado_por_nome, emitidoPor: operador, extra: validacaoDocumentoHtml(validacao) })}

      <div class="signatures" style="margin-top:30mm"><div class="signature">Presidência da AAC</div><div class="signature">Tesouraria-Geral da AAC</div></div>
      <div class="signatures" style="margin-top:20mm;grid-template-columns:1fr"><div class="signature">Conselho Fiscal</div></div>
    </div>
  </main>`;
  abrirJanelaImpressao(plano.titulo || 'Planejamento Financeiro AAC', html);
}

export async function imprimirPrestacaoContasFinanceira({ titulo, periodo, tipoPeriodo, planejamento = null, lancamentos = [], resumo = {}, emitidoPor = null, validacao = null } = {}) {
  const url = validacao?.url_validacao || (validacao?.codigo_validacao ? `${baseConsultaPublica()}/validar/${encodeURIComponent(validacao.codigo_validacao)}` : '');
  const qr = url ? await gerarQrCodeDataUrl(url) : '';
  const fundosRows = (resumo.fundos || []).map(f => `<tr><td>${escapeHtml(f.fundo)}</td><td>${money(f.entradas)}</td><td>${money(f.saidas)}</td><td><strong>${money(f.saldo)}</strong></td><td>${f.qtd || 0}</td></tr>`).join('');
  const lancRows = (lancamentos || []).map(l => `<tr><td>${dateBR(l.data_movimento)}</td><td>${escapeHtml(l.tipo)}</td><td>${escapeHtml(l.fundo_nome || l.categoria || '-')}</td><td>${escapeHtml(l.descricao || '-')}</td><td>${l.tipo === 'entrada' ? money(l.valor_bruto || l.valor) : '-'}</td><td>${l.tipo === 'entrada' ? money(l.taxa_operacional || 0) : '-'}</td><td>${money(l.valor)}</td></tr>`).join('');

  const html = `<div class="print-actions"><button onclick="window.print()">Imprimir / salvar PDF</button></div>
  <main class="page">
    <div class="page-inner">
      <div class="header">
        <img class="logo" src="/logo.png" alt="Logo AAC">
        <div>
          <div class="title">Associação Amigos Carroceiros (AAC)</div>
          <div class="subtitle">CNPJ: ${CNPJ_AAC}<br>Sede Provisória: ${SEDE_AAC}</div>
        </div>
        ${qr ? `<img class="qr" src="${qr}" alt="QR Code" style="margin-left:auto;width:20mm;height:20mm">` : ''}
      </div>

      <div class="doc-title">PRESTAÇÃO DE CONTAS FINANCEIRA</div>
      <div class="notice">
        <strong>${escapeHtml(titulo || 'Prestação de Contas')}</strong><br>
        <strong>Período:</strong> ${escapeHtml(periodo || '-')}<br>
        <strong>Tipo:</strong> ${escapeHtml(tipoPeriodo || '-')}<br>
        <strong>Planejamento vinculado:</strong> ${escapeHtml(planejamento?.titulo || 'Todos/sem filtro')}
        ${validacaoDocumentoHtml(validacao) ? `<br>${validacaoDocumentoHtml(validacao)}` : ''}
      </div>

      <div class="two-col no-break">
        <div class="notice"><strong>Receitas brutas registradas:</strong> ${money(resumo.bruto || resumo.entradas || 0)}<br><strong>Taxas operacionais:</strong> ${money(resumo.taxas || 0)}<br><strong>Receitas líquidas:</strong> ${money(resumo.entradas || 0)}</div>
        <div class="notice"><strong>Despesas:</strong> ${money(resumo.saidas || 0)}<br><strong>Saldo do período:</strong> ${money(resumo.saldo || 0)}<br><strong>Lançamentos:</strong> ${(lancamentos || []).length}</div>
      </div>

      <div class="section-title">1. Resultado por fundo</div>
      <table class="table"><thead><tr><th>Fundo</th><th>Entradas líquidas</th><th>Despesas</th><th>Saldo</th><th>Qtde.</th></tr></thead><tbody>${fundosRows || '<tr><td colspan="5">Sem fundos ou lançamentos no período.</td></tr>'}</tbody></table>

      <div class="section-title">2. Lançamentos do período</div>
      <table class="table"><thead><tr><th>Data</th><th>Tipo</th><th>Fundo/Categoria</th><th>Descrição</th><th>Bruto</th><th>Taxa</th><th>Valor</th></tr></thead><tbody>${lancRows || '<tr><td colspan="7">Sem lançamentos no período.</td></tr>'}</tbody></table>

      <p class="terms" style="margin-top:10px">Este relatório foi gerado com base nos registros financeiros internos da AAC. As mensalidades pagas registram a entrada bruta e a taxa de boleto/Asaas, considerando como distribuível apenas o valor líquido. Receitas extras e despesas seguem os registros financeiros vinculados aos fundos.</p>
      ${metaDocumento({ emitidoPor, extra: validacaoDocumentoHtml(validacao) })}

      <div class="signatures" style="margin-top:28mm">
        <div class="signature">Presidência da AAC</div>
        <div class="signature">Tesouraria-Geral da AAC</div>
      </div>
      <div class="signatures" style="margin-top:20mm;grid-template-columns:1fr">
        <div class="signature">Conselho Fiscal</div>
      </div>
    </div>
  </main>`;
  abrirJanelaImpressao(titulo || 'Prestação de Contas AAC', html);
}
