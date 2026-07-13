import { dateBR, dateTimeBR } from './format';
import { gerarQrCodeDataUrl } from './qrcode';
import { urlValidacaoDocumento } from './validacao';
import { escapeHtml } from './printDocs';

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

function preencherCamposAssinatura(html = '', assinantes = [], doc = {}) {
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
    blocosExtras.push(assinaturaDocumentoHtml(assinantes[i], doc));
  }
  if (!blocosExtras.length) return preenchido;
  return `${preenchido}<main class="page"><div class="page-inner"><div class="doc-title">ASSINATURAS ELETRÔNICAS</div><div class="assinaturas-digitais">${blocosExtras.join('')}</div></div></main>`;
}

export function montarDocumentoOficialHtml(doc, assinantes = [], qr = '') {
  const codigo = doc.codigo_validacao || 'pendente';
  const hash = doc.documento_final_hash || doc.hash_documento || doc.documento_original_hash || 'pendente';
  const base = doc.documento_assinado_html || doc.documento_original_html || doc.conteudo_html || '';
  if (base.includes('class="page"') || base.includes("class='page'")) {
    const corpo = preencherCamposAssinatura(base, assinantes, doc);
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

export async function abrirDocumentoFinalPorId(supabase, documentoId) {
  if (!documentoId) return { error: new Error('Documento assinado não vinculado.') };
  const [{ data: doc, error: docError }, { data: assinantes, error: assinantesError }] = await Promise.all([
    supabase.from('documentos_processos').select('*').eq('id', documentoId).single(),
    supabase.from('documento_assinantes').select('*').eq('documento_id', documentoId).order('ordem', { ascending: true })
  ]);
  if (docError || assinantesError) return { error: docError || assinantesError };
  const qr = doc.codigo_validacao ? await gerarQrCodeDataUrl(urlValidacaoDocumento(doc.codigo_validacao)) : '';
  const win = window.open('', '_blank');
  if (!win) return { error: new Error('O navegador bloqueou a janela. Libere pop-ups para abrir o documento.') };
  win.document.write(`<!doctype html><html><head><title>${escapeHtml(doc.titulo || 'Documento AAC')}</title></head><body>
    <div class="print-actions"><button onclick="window.print()">Imprimir / salvar PDF</button></div>
    ${montarDocumentoOficialHtml(doc, assinantes || [], qr)}
  </body></html>`);
  win.document.close();
  return { data: doc };
}
