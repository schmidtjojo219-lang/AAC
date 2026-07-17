import { useEffect, useMemo, useState } from 'react';
import { CalendarClock, CheckCircle2, Download, Edit3, FileText, Plus, ReceiptText, RefreshCcw, Save, ShieldAlert, Trash2, XCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { dateBR, money } from '../lib/format';
import { canEdit } from '../lib/permissions';
import { imprimirReciboMensalidade, imprimirRelatorioInadimplencia } from '../lib/printDocs';
import { registrarValidacaoDocumento } from '../lib/validacao';
import PageShell from '../components/PageShell';
import StatCard from '../components/StatCard';
import EmptyState from '../components/EmptyState';

const VALOR_PADRAO = 25;
const TAXA_BOLETO_PADRAO = 0.99;

function competenciaAtual() {
  return new Date().toISOString().slice(0, 7);
}

function vencimentoPadrao(competencia = competenciaAtual()) {
  return `${competencia}-15`;
}

const inicial = {
  id: null,
  associado_id: '',
  competencia: competenciaAtual(),
  data_vencimento: vencimentoPadrao(),
  valor: VALOR_PADRAO,
  juros: 0,
  desconto: 0,
  valor_pago: '',
  data_pagamento: '',
  forma_pagamento: '',
  recebido_por: '',
  status: 'aberto',
  observacoes: '',
  observacoes_quitacao: ''
};

const statusLabel = {
  aberto: 'Aberto',
  pago: 'Pago',
  atrasado: 'Atrasado',
  isento: 'Isento',
  cancelado: 'Cancelado'
};

function numero(valor) {
  if (valor === null || valor === undefined || valor === '') return 0;
  return Number(String(valor).replace(',', '.')) || 0;
}

function hojeISO() {
  return new Date().toISOString().slice(0, 10);
}

function diasAtraso(vencimento, status) {
  if (!vencimento || ['pago', 'cancelado', 'isento'].includes(status)) return 0;
  const hoje = new Date();
  const v = new Date(`${vencimento}T00:00:00`);
  const diff = Math.floor((hoje - v) / 86400000);
  return Math.max(diff, 0);
}

function calcularJuros(valor, vencimento, status) {
  const dias = diasAtraso(vencimento, status);
  if (dias <= 0) return 0;
  return Number(valor || 0) * 0.01 * (dias / 30);
}

function valorDevido(item) {
  const juros = Number(item.juros || 0) || calcularJuros(item.valor, item.data_vencimento, item.status);
  return Math.max(Number(item.valor || 0) + juros - Number(item.desconto || 0), 0);
}

function gerarNumeroRecibo(item) {
  const comp = String(item.competencia || competenciaAtual()).replace('-', '');
  const parte = String(item.id || crypto.randomUUID()).slice(0, 8).toUpperCase();
  return `AAC-REC-${comp}-${parte}`;
}

function associadoIsentoNaCompetencia(associado, competencia) {
  const tipo = associado?.isencao_mensalidade || 'sem_isencao';
  if (tipo === 'permanente') return true;
  if (tipo === 'ate_data' && associado?.isencao_ate) return String(associado.isencao_ate).slice(0, 7) >= competencia;
  if (tipo === 'primeiro_mes') {
    const base = associado?.data_admissao || associado?.created_at;
    return base ? String(base).slice(0, 7) === competencia : false;
  }
  return false;
}

function csvDownload(nome, linhas) {
  const csv = linhas.map(linha => linha.map(campo => `"${String(campo ?? '').replaceAll('"', '""')}"`).join(';')).join('\n');
  const blob = new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nome;
  a.click();
  URL.revokeObjectURL(url);
}

export default function Mensalidades({ profile }) {
  const [lista, setLista] = useState([]);
  const [associados, setAssociados] = useState([]);
  const [form, setForm] = useState(inicial);
  const [loading, setLoading] = useState(false);
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [filtroCompetencia, setFiltroCompetencia] = useState(competenciaAtual());
  const [mostrarTodas, setMostrarTodas] = useState(false);
  const podeEditar = canEdit(profile, 'financeiro');
  const editando = Boolean(form.id);

  useEffect(() => { carregar(); }, []);

  async function carregar() {
    setLoading(true);
    const [{ data: mensalidadesData, error: mensalidadesError }, { data: associadosData }] = await Promise.all([
      supabase.from('mensalidades').select('*, associados(nome_completo, cpf, matricula, numero_ficha, status)').order('competencia', { ascending: false }).order('created_at', { ascending: false }),
      supabase.from('associados').select('id, nome_completo, cpf, matricula, numero_ficha, status, data_admissao, isencao_mensalidade, isencao_ate, motivo_isencao, created_at').eq('status', 'aprovado').order('nome_completo')
    ]);
    if (mensalidadesError) alert('Erro ao carregar mensalidades: ' + mensalidadesError.message);
    setLista(mensalidadesData || []);
    setAssociados(associadosData || []);
    setLoading(false);
  }

  function limparForm() {
    setForm({ ...inicial, competencia: filtroCompetencia || competenciaAtual(), data_vencimento: vencimentoPadrao(filtroCompetencia || competenciaAtual()) });
  }

  function atualizarCompetencia(valor) {
    setForm({ ...form, competencia: valor, data_vencimento: vencimentoPadrao(valor) });
  }

  function editar(item) {
    setForm({
      id: item.id,
      associado_id: item.associado_id || '',
      competencia: item.competencia || competenciaAtual(),
      data_vencimento: item.data_vencimento || vencimentoPadrao(),
      valor: item.valor ?? VALOR_PADRAO,
      juros: item.juros ?? 0,
      desconto: item.desconto ?? 0,
      valor_pago: item.valor_pago ?? '',
      data_pagamento: item.data_pagamento || '',
      forma_pagamento: item.forma_pagamento || '',
      recebido_por: item.recebido_por || '',
      status: item.status || 'aberto',
      observacoes: item.observacoes || '',
      observacoes_quitacao: item.observacoes_quitacao || ''
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function salvar(e) {
    e.preventDefault();
    if (!podeEditar) return;
    const statusFinal = diasAtraso(form.data_vencimento, form.status) > 0 && form.status === 'aberto' ? 'atrasado' : form.status;
    const jurosCalculado = ['aberto', 'atrasado'].includes(statusFinal) ? calcularJuros(form.valor, form.data_vencimento, statusFinal) : numero(form.juros);
    const payload = {
      associado_id: form.associado_id,
      competencia: form.competencia,
      data_vencimento: form.data_vencimento,
      valor: numero(form.valor) || VALOR_PADRAO,
      juros: Number(jurosCalculado.toFixed(2)),
      desconto: numero(form.desconto),
      valor_pago: form.valor_pago !== '' ? numero(form.valor_pago) : null,
      data_pagamento: form.data_pagamento || null,
      forma_pagamento: form.forma_pagamento || null,
      recebido_por: form.recebido_por || null,
      status: statusFinal,
      observacoes: form.observacoes || null,
      observacoes_quitacao: form.observacoes_quitacao || null
    };

    const query = editando
      ? supabase.from('mensalidades').update(payload).eq('id', form.id)
      : supabase.from('mensalidades').insert(payload);
    const { error } = await query;
    if (error) {
      alert('Erro ao salvar mensalidade: ' + error.message + '\n\nSe aparecer coluna inexistente, execute o arquivo sql/atualizacao-v4.sql no Supabase.');
      return;
    }
    limparForm();
    await carregar();
  }

  async function buscarPlanejamentoDaCompetencia(competencia) {
    const { data, error } = await supabase
      .from('planejamentos_financeiros')
      .select('*, planejamento_fundos(*)')
      .lte('mes_inicio', competencia)
      .gte('mes_fim', competencia)
      .eq('status', 'ativo')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) {
      console.warn('Planejamento não localizado:', error.message);
      return null;
    }
    return data || null;
  }

  function distribuirLiquidoMensalidade(liquido, fundos) {
    const fundosOrdenados = (fundos || []).slice().sort((a, b) => (a.ordem || 0) - (b.ordem || 0));
    if (!fundosOrdenados.length) return [];
    let acumulado = 0;
    return fundosOrdenados.map((fundo, index) => {
      const valor = index === fundosOrdenados.length - 1
        ? Number((liquido - acumulado).toFixed(2))
        : Number((liquido * Number(fundo.percentual || 0) / 100).toFixed(2));
      acumulado += valor;
      return { fundo, valor };
    }).filter(item => item.valor > 0);
  }

  async function marcarPago(item) {
    if (!podeEditar) return;
    const forma = prompt('Forma de pagamento:', item.forma_pagamento || 'Boleto Asaas') || item.forma_pagamento || 'Boleto Asaas';
    const dataPagamento = prompt('Data do pagamento (AAAA-MM-DD):', item.data_pagamento || hojeISO()) || item.data_pagamento || hojeISO();
    const valorBruto = Number((Number(item.valor || VALOR_PADRAO) + Number(item.juros || 0) - Number(item.desconto || 0)).toFixed(2));
    const taxaBoleto = TAXA_BOLETO_PADRAO;
    const valorLiquido = Number(Math.max(valorBruto - taxaBoleto, 0).toFixed(2));
    const numeroRecibo = item.numero_recibo || gerarNumeroRecibo(item);
    const planejamento = await buscarPlanejamentoDaCompetencia(item.competencia);
    const grupo = crypto.randomUUID();

    if (!item.financeiro_id) {
      const distribuicoes = planejamento ? distribuirLiquidoMensalidade(valorLiquido, planejamento.planejamento_fundos || []) : [];
      const entradas = distribuicoes.length ? distribuicoes.map(({ fundo, valor }, index) => ({
        tipo: 'entrada',
        data_movimento: dataPagamento,
        descricao: `Mensalidade ${item.competencia} - ${item.associados?.nome_completo || 'Associado AAC'} — ${fundo.nome}`,
        categoria: 'Mensalidade associativa',
        valor,
        forma_pagamento: forma,
        planejamento_id: planejamento.id,
        fundo_id: fundo.id,
        fundo_nome: fundo.nome,
        valor_bruto: index === distribuicoes.length - 1
          ? Number((valorBruto - distribuicoes.slice(0, -1).reduce((acc, d) => acc + Number((valorBruto * Number(d.fundo.percentual || 0) / 100).toFixed(2)), 0)).toFixed(2))
          : Number((valorBruto * Number(fundo.percentual || 0) / 100).toFixed(2)),
        taxa_operacional: index === distribuicoes.length - 1
          ? Number((taxaBoleto - distribuicoes.slice(0, -1).reduce((acc, d) => acc + Number((taxaBoleto * Number(d.fundo.percentual || 0) / 100).toFixed(2)), 0)).toFixed(2))
          : Number((taxaBoleto * Number(fundo.percentual || 0) / 100).toFixed(2)),
        valor_liquido: valor,
        grupo_distribuicao_id: grupo,
        mensalidade_id: item.id,
        origem: 'mensalidade_liquida',
        competencia: item.competencia
      })) : [{
        tipo: 'entrada',
        data_movimento: dataPagamento,
        descricao: `Mensalidade ${item.competencia} - ${item.associados?.nome_completo || 'Associado AAC'}`,
        categoria: 'Mensalidade associativa',
        valor: valorLiquido,
        forma_pagamento: forma,
        valor_bruto: valorBruto,
        taxa_operacional: taxaBoleto,
        valor_liquido: valorLiquido,
        grupo_distribuicao_id: grupo,
        mensalidade_id: item.id,
        origem: 'mensalidade_liquida',
        competencia: item.competencia
      }];

      const taxa = {
        tipo: 'saida',
        data_movimento: dataPagamento,
        descricao: `Taxa boleto Asaas - Mensalidade ${item.competencia} - ${item.associados?.nome_completo || 'Associado AAC'}`,
        categoria: 'Taxa boleto bancário / Asaas',
        valor: taxaBoleto,
        forma_pagamento: 'Débito automático Asaas',
        planejamento_id: planejamento?.id || null,
        valor_bruto: null,
        taxa_operacional: 0,
        valor_liquido: null,
        grupo_distribuicao_id: grupo,
        mensalidade_id: item.id,
        origem: 'taxa_boleto_mensalidade',
        competencia: item.competencia
      };

      const { data: financeiros, error: finError } = await supabase.from('financeiro').insert([...entradas, taxa]).select('id, origem');
      if (finError) {
        alert('Erro ao lançar mensalidade/taxa no financeiro: ' + finError.message + '\n\nConfirme se o SQL v6.6.2 foi executado no Supabase.');
        return;
      }
      const entradaPrincipal = (financeiros || []).find(f => f.origem === 'mensalidade_liquida') || financeiros?.[0];
      item.financeiro_id = entradaPrincipal?.id || null;
    }

    const { error } = await supabase.from('mensalidades').update({
      status: 'pago',
      data_pagamento: dataPagamento,
      forma_pagamento: forma,
      valor_pago: valorBruto,
      juros: Number((Number(item.juros || 0) || calcularJuros(item.valor, item.data_vencimento, item.status)).toFixed(2)),
      numero_recibo: numeroRecibo,
      recibo_emitido_em: new Date().toISOString(),
      recebido_por: profile?.nome || profile?.email || 'Tesouraria AAC',
      financeiro_id: item.financeiro_id || null
    }).eq('id', item.id);

    if (error) alert('Erro ao marcar como pago: ' + error.message + '\n\nConfirme se a atualização-v4.sql foi executada no Supabase.');
    await carregar();
  }

  async function alterarStatus(item, status) {
    if (!podeEditar) return;
    const mensagem = status === 'isento' ? 'Marcar mensalidade como isenta?' : status === 'cancelado' ? 'Cancelar esta mensalidade?' : 'Reabrir esta mensalidade?';
    if (!confirm(mensagem)) return;
    const { error } = await supabase.from('mensalidades').update({ status, updated_at: new Date().toISOString() }).eq('id', item.id);
    if (error) alert('Erro ao alterar status: ' + error.message);
    await carregar();
  }

  async function gerarMesParaTodos() {
    if (!podeEditar) return;
    const competencia = filtroCompetencia || form.competencia || competenciaAtual();
    const isentos = associados.filter(a => associadoIsentoNaCompetencia(a, competencia));
    const pagantes = associados.length - isentos.length;
    if (!confirm(`Gerar mensalidade de ${money(VALOR_PADRAO)} para associados aprovados na competência ${competencia}?\n\nPagantes previstos: ${pagantes}\nIsentos no mês: ${isentos.length}\nDuplicadas serão ignoradas.`)) return;
    const registros = associados.map(a => ({
      associado_id: a.id,
      competencia,
      data_vencimento: vencimentoPadrao(competencia),
      valor: associadoIsentoNaCompetencia(a, competencia) ? 0 : VALOR_PADRAO,
      juros: 0,
      desconto: 0,
      status: associadoIsentoNaCompetencia(a, competencia) ? 'isento' : 'aberto',
      observacoes: associadoIsentoNaCompetencia(a, competencia)
        ? `Mensalidade isenta. ${a.motivo_isencao || 'Isencao registrada no cadastro do associado.'}`
        : 'Gerado automaticamente pela Tesouraria.'
    }));
    const { error } = await supabase.from('mensalidades').upsert(registros, { onConflict: 'associado_id,competencia', ignoreDuplicates: true });
    if (error) alert('Erro ao gerar mensalidades: ' + error.message);
    await carregar();
  }

  async function atualizarAtrasos() {
    if (!podeEditar) return;
    const hoje = hojeISO();
    const vencidas = lista.filter(m => m.status === 'aberto' && m.data_vencimento < hoje);
    if (!vencidas.length) {
      alert('Nenhuma mensalidade aberta vencida encontrada.');
      return;
    }
    if (!confirm(`Atualizar ${vencidas.length} mensalidade(s) abertas vencidas para status ATRASADO?`)) return;
    for (const item of vencidas) {
      await supabase.from('mensalidades').update({
        status: 'atrasado',
        juros: Number(calcularJuros(item.valor, item.data_vencimento, 'atrasado').toFixed(2))
      }).eq('id', item.id);
    }
    await carregar();
  }

  async function excluir(id) {
    if (!podeEditar) return;
    if (!confirm('Excluir mensalidade? Se ela já gerou lançamento financeiro, o lançamento financeiro não será apagado automaticamente.')) return;
    const { error } = await supabase.from('mensalidades').delete().eq('id', id);
    if (error) alert('Erro ao excluir: ' + error.message);
    await carregar();
  }

  const listaFiltrada = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return lista.filter(m => {
      const associado = m.associados || {};
      const texto = `${associado.nome_completo || ''} ${associado.cpf || ''} ${associado.matricula || ''} ${associado.numero_ficha || ''}`.toLowerCase();
      const statusReal = (m.status === 'aberto' && diasAtraso(m.data_vencimento, m.status) > 0) ? 'atrasado' : m.status;
      const passaBusca = !termo || texto.includes(termo);
      const passaStatus = filtroStatus === 'todos' || statusReal === filtroStatus;
      const passaCompetencia = mostrarTodas || !filtroCompetencia || m.competencia === filtroCompetencia;
      return passaBusca && passaStatus && passaCompetencia;
    });
  }, [lista, busca, filtroStatus, filtroCompetencia, mostrarTodas]);

  const totais = useMemo(() => {
    let aberto = 0, pago = 0, atrasado = 0, isento = 0, cancelado = 0, atrasadosQtde = 0, recibos = 0;
    listaFiltrada.forEach(m => {
      const devido = valorDevido(m);
      const statusReal = (m.status === 'aberto' && diasAtraso(m.data_vencimento, m.status) > 0) ? 'atrasado' : m.status;
      if (statusReal === 'pago') {
        pago += Number(m.valor_pago || devido);
        if (m.numero_recibo) recibos += 1;
      } else if (statusReal === 'isento') isento += Number(m.valor || 0);
      else if (statusReal === 'cancelado') cancelado += Number(m.valor || 0);
      else {
        aberto += devido;
        if (statusReal === 'atrasado') { atrasado += devido; atrasadosQtde += 1; }
      }
    });
    return { aberto, pago, atrasado, atrasadosQtde, isento, cancelado, recibos };
  }, [listaFiltrada]);

  const atrasosPorAssociado = useMemo(() => {
    const map = new Map();
    lista.forEach(m => {
      const vencida = !['pago', 'cancelado', 'isento'].includes(m.status) && (m.status === 'atrasado' || diasAtraso(m.data_vencimento, m.status) > 0);
      if (vencida) {
        const atual = map.get(m.associado_id) || { qtde: 0, valor: 0, ultimo: null };
        atual.qtde += 1;
        atual.valor += valorDevido(m);
        atual.ultimo = !atual.ultimo || m.data_vencimento > atual.ultimo ? m.data_vencimento : atual.ultimo;
        map.set(m.associado_id, atual);
      }
    });
    return map;
  }, [lista]);

  const inadimplentes = useMemo(() => {
    const rows = [];
    atrasosPorAssociado.forEach((info, associadoId) => {
      const mensalidade = lista.find(m => m.associado_id === associadoId);
      if (mensalidade) rows.push({
        associado: mensalidade.associados?.nome_completo || '-',
        matricula: mensalidade.associados?.matricula || mensalidade.associados?.numero_ficha || '-',
        parcelasVencidas: info.qtde,
        valorVencido: info.valor,
        ultimoVencimento: info.ultimo
      });
    });
    return rows.sort((a, b) => b.parcelasVencidas - a.parcelasVencidas || b.valorVencido - a.valorVencido);
  }, [atrasosPorAssociado, lista]);

  function exportarCSV() {
    const linhas = [
      ['Associado', 'Matrícula', 'Competência', 'Vencimento', 'Status', 'Valor', 'Juros', 'Desconto', 'Valor pago', 'Data pagamento', 'Forma', 'Recibo'],
      ...listaFiltrada.map(m => [
        m.associados?.nome_completo || '',
        m.associados?.matricula || m.associados?.numero_ficha || '',
        m.competencia,
        m.data_vencimento,
        statusLabel[(m.status === 'aberto' && diasAtraso(m.data_vencimento, m.status) > 0) ? 'atrasado' : m.status] || m.status,
        m.valor,
        m.juros || calcularJuros(m.valor, m.data_vencimento, m.status).toFixed(2),
        m.desconto || 0,
        m.valor_pago || '',
        m.data_pagamento || '',
        m.forma_pagamento || '',
        m.numero_recibo || ''
      ])
    ];
    csvDownload(`mensalidades-aac-${filtroCompetencia || 'todas'}.csv`, linhas);
  }

  function gerarRelatorioInadimplencia() {
    imprimirRelatorioInadimplencia({
      titulo: 'Relatório de Inadimplência - Mensalidades AAC',
      itens: inadimplentes,
      dataReferencia: hojeISO()
    });
  }


  async function imprimirReciboValidado(m) {
    const validacao = await registrarValidacaoDocumento({
      tipo_documento: 'Recibo de Contribuição Associativa',
      titulo: `Recibo ${m.numero_recibo || m.competencia || ''} - ${m.associados?.nome_completo || ''}`,
      codigo_referencia: m.numero_recibo || m.id,
      associado_id: m.associado_id || null,
      mensalidade_id: m.id || null,
      emitido_por_nome: profile?.nome || profile?.email || '',
      emitido_por_email: profile?.email || '',
      dados_publicos: {
        nome: m.associados?.nome_completo || '',
        matricula: m.associados?.matricula || m.associados?.numero_ficha || '',
        competencia: m.competencia || '',
        recibo: m.numero_recibo || ''
      }
    });
    imprimirReciboMensalidade(m, validacao.data);
  }
  return (
    <PageShell eyebrow="Tesouraria" title="Mensalidades" description="Controle completo da contribuição associativa de R$ 25,00: geração mensal, baixa de pagamentos, juros de 1% ao mês pro rata die, recibos e alerta para 3 parcelas vencidas." action={<button className="btn-secondary" onClick={carregar}><RefreshCcw size={16}/> {loading ? 'Carregando...' : 'Atualizar'}</button>}>
      <div className="mb-7 grid gap-5 md:grid-cols-2 xl:grid-cols-5">
        <StatCard title="Em aberto" value={money(totais.aberto)} subtitle={`${listaFiltrada.filter(m => !['pago','cancelado','isento'].includes(m.status)).length} parcelas`} />
        <StatCard title="Recebido" value={money(totais.pago)} subtitle="mensalidades pagas" />
        <StatCard title="Atrasadas" value={money(totais.atrasado)} subtitle={`${totais.atrasadosQtde} parcelas vencidas`} />
        <StatCard title="Risco 3+ parcelas" value={inadimplentes.filter(i => i.parcelasVencidas >= 3).length} subtitle="avaliar exclusão" />
        <StatCard title="Recibos" value={totais.recibos} subtitle="recibos gerados" />
      </div>

      <div className="card mb-7 p-5">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <div><label className="label">Competência</label><input type="month" className="field" value={filtroCompetencia} onChange={e => { setFiltroCompetencia(e.target.value); setForm(f => ({...f, competencia: e.target.value, data_vencimento: vencimentoPadrao(e.target.value)})); }} /></div>
          <div><label className="label">Status</label><select className="field" value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}><option value="todos">Todos</option><option value="aberto">Aberto</option><option value="atrasado">Atrasado</option><option value="pago">Pago</option><option value="isento">Isento</option><option value="cancelado">Cancelado</option></select></div>
          <div className="xl:col-span-2"><label className="label">Buscar associado</label><input className="field" value={busca} onChange={e => setBusca(e.target.value)} placeholder="Nome, CPF ou matrícula" /></div>
          <div className="flex items-end gap-2"><label className="inline-flex items-center gap-2 rounded-2xl bg-creme px-4 py-3 text-sm font-bold text-floresta"><input type="checkbox" checked={mostrarTodas} onChange={e => setMostrarTodas(e.target.checked)} /> Todas</label></div>
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          {podeEditar && <button type="button" className="btn-primary" onClick={gerarMesParaTodos}><CalendarClock size={16}/> Gerar mês para todos</button>}
          {podeEditar && <button type="button" className="btn-secondary" onClick={atualizarAtrasos}><ShieldAlert size={16}/> Atualizar atrasos</button>}
          <button type="button" className="btn-secondary" onClick={exportarCSV}><Download size={16}/> Exportar CSV</button>
          <button type="button" className="btn-secondary" onClick={gerarRelatorioInadimplencia}><FileText size={16}/> Relatório de inadimplência</button>
        </div>
      </div>

      {podeEditar && (
        <form onSubmit={salvar} className="card mb-7 p-5">
          <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-2 text-floresta"><Plus size={20}/><h2 className="text-xl font-black">{editando ? 'Editar mensalidade' : 'Nova mensalidade'}</h2></div>
            {editando && <button type="button" className="btn-secondary" onClick={limparForm}><XCircle size={16}/> Cancelar edição</button>}
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="md:col-span-2"><label className="label">Associado</label><select className="field" value={form.associado_id} onChange={e => setForm({...form, associado_id: e.target.value})} required><option value="">Selecione</option>{associados.map(a => <option key={a.id} value={a.id}>{a.nome_completo} {a.matricula ? `• ${a.matricula}` : ''}</option>)}</select></div>
            <div><label className="label">Competência</label><input type="month" className="field" value={form.competencia} onChange={e => atualizarCompetencia(e.target.value)} required /></div>
            <div><label className="label">Vencimento</label><input type="date" className="field" value={form.data_vencimento} onChange={e => setForm({...form, data_vencimento: e.target.value})} /></div>
            <div><label className="label">Valor</label><input className="field" value={form.valor} onChange={e => setForm({...form, valor: e.target.value})} /></div>
            <div><label className="label">Juros manual</label><input className="field" value={form.juros} onChange={e => setForm({...form, juros: e.target.value})} /></div>
            <div><label className="label">Desconto/abatimento</label><input className="field" value={form.desconto} onChange={e => setForm({...form, desconto: e.target.value})} /></div>
            <div><label className="label">Status</label><select className="field" value={form.status} onChange={e => setForm({...form, status: e.target.value})}><option value="aberto">Aberto</option><option value="pago">Pago</option><option value="atrasado">Atrasado</option><option value="isento">Isento</option><option value="cancelado">Cancelado</option></select></div>
            <div><label className="label">Data pagamento</label><input type="date" className="field" value={form.data_pagamento} onChange={e => setForm({...form, data_pagamento: e.target.value})} /></div>
            <div><label className="label">Valor pago</label><input className="field" value={form.valor_pago} onChange={e => setForm({...form, valor_pago: e.target.value})} placeholder="0,00" /></div>
            <div><label className="label">Forma de pagamento</label><input className="field" value={form.forma_pagamento} onChange={e => setForm({...form, forma_pagamento: e.target.value})} placeholder="Pix, dinheiro..." /></div>
            <div><label className="label">Recebido por</label><input className="field" value={form.recebido_por} onChange={e => setForm({...form, recebido_por: e.target.value})} placeholder="Tesouraria AAC" /></div>
            <div className="md:col-span-2"><label className="label">Observações gerais</label><textarea className="field" value={form.observacoes} onChange={e => setForm({...form, observacoes: e.target.value})}></textarea></div>
            <div className="md:col-span-2"><label className="label">Observações da quitação/recibo</label><textarea className="field" value={form.observacoes_quitacao} onChange={e => setForm({...form, observacoes_quitacao: e.target.value})}></textarea></div>
          </div>
          <button className="btn-primary mt-5"><Save size={18}/> {editando ? 'Salvar alterações' : 'Salvar mensalidade'}</button>
        </form>
      )}

      {inadimplentes.some(i => i.parcelasVencidas >= 3) && (
        <div className="mb-7 rounded-3xl border border-red-100 bg-red-50 p-5 text-red-800">
          <div className="flex items-center gap-2 font-black"><ShieldAlert size={20}/> Atenção estatutária</div>
          <p className="mt-2 text-sm">Há associado(s) com 3 ou mais parcelas vencidas. Conforme a ficha de inscrição, isso pode resultar em exclusão automática do quadro associativo após análise da Diretoria.</p>
        </div>
      )}

      {listaFiltrada.length === 0 ? <EmptyState>Nenhuma mensalidade encontrada para os filtros selecionados.</EmptyState> : (
        <div className="table-wrap"><table className="table"><thead><tr><th>Associado</th><th>Competência</th><th>Vencimento</th><th>Status</th><th>Valores</th><th>Pagamento/Recibo</th><th>Ações</th></tr></thead><tbody>
          {listaFiltrada.map(m => {
            const dias = diasAtraso(m.data_vencimento, m.status);
            const juros = Number(m.juros || 0) || calcularJuros(m.valor, m.data_vencimento, m.status);
            const total = valorDevido({ ...m, juros });
            const infoAtraso = atrasosPorAssociado.get(m.associado_id);
            const statusReal = (m.status === 'aberto' && dias > 0) ? 'atrasado' : m.status;
            return <tr key={m.id}>
              <td><strong className="text-floresta">{m.associados?.nome_completo || '-'}</strong><br/><span className="text-xs text-slate-500">{m.associados?.matricula || m.associados?.numero_ficha || 'Sem matrícula'}</span>{infoAtraso?.qtde >= 3 && <div className="mt-2 inline-flex rounded-xl bg-red-50 px-2 py-1 text-xs font-black text-red-700">3+ parcelas vencidas</div>}</td>
              <td>{m.competencia}</td>
              <td>{dateBR(m.data_vencimento)}{dias > 0 && m.status !== 'pago' && <><br/><span className="text-xs font-bold text-red-700">{dias} dias de atraso</span></>}</td>
              <td><span className={`badge ${statusReal === 'pago' ? 'bg-green-50 text-green-700' : statusReal === 'atrasado' ? 'bg-red-50 text-red-700' : statusReal === 'isento' ? 'bg-blue-50 text-blue-700' : statusReal === 'cancelado' ? 'bg-slate-100 text-slate-600' : 'bg-creme text-floresta'}`}>{statusLabel[statusReal] || statusReal}</span></td>
              <td><strong>{money(total)}</strong><br/><span className="text-xs text-slate-500">Base: {money(m.valor)} • Juros: {money(juros)} • Desc.: {money(m.desconto || 0)}</span></td>
              <td>{m.status === 'pago' ? <><strong className="text-green-700">{money(m.valor_pago || total)}</strong><br/><span className="text-xs text-slate-500">{dateBR(m.data_pagamento)} • {m.forma_pagamento || '-'}</span><br/>{m.numero_recibo && <span className="text-xs font-bold text-floresta">{m.numero_recibo}</span>}</> : <span className="text-xs text-slate-500">Ainda não quitada</span>}</td>
              <td><div className="flex flex-wrap gap-2">
                {podeEditar && m.status !== 'pago' && !['cancelado','isento'].includes(m.status) && <button className="rounded-xl bg-green-50 p-2 text-green-700" onClick={() => marcarPago(m)} title="Marcar como pago"><CheckCircle2 size={16}/></button>}
                {m.status === 'pago' && <button className="rounded-xl bg-amber-50 p-2 text-amber-700" onClick={() => imprimirReciboValidado(m)} title="Imprimir recibo validado"><ReceiptText size={16}/></button>}
                {podeEditar && <button className="rounded-xl bg-blue-50 p-2 text-blue-700" onClick={() => editar(m)} title="Editar"><Edit3 size={16}/></button>}
                {podeEditar && m.status !== 'isento' && m.status !== 'pago' && <button className="rounded-xl bg-blue-50 p-2 text-blue-700" onClick={() => alterarStatus(m, 'isento')} title="Isentar"><FileText size={16}/></button>}
                {podeEditar && m.status !== 'cancelado' && m.status !== 'pago' && <button className="rounded-xl bg-slate-100 p-2 text-slate-700" onClick={() => alterarStatus(m, 'cancelado')} title="Cancelar"><XCircle size={16}/></button>}
                {podeEditar && ['cancelado','isento'].includes(m.status) && <button className="rounded-xl bg-creme p-2 text-floresta" onClick={() => alterarStatus(m, 'aberto')} title="Reabrir"><RefreshCcw size={16}/></button>}
                {podeEditar && <button className="rounded-xl bg-red-50 p-2 text-red-700" onClick={() => excluir(m.id)} title="Excluir"><Trash2 size={16}/></button>}
              </div></td>
            </tr>;
          })}
        </tbody></table></div>
      )}
    </PageShell>
  );
}
