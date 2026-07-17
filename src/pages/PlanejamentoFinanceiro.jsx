import { useEffect, useMemo, useState } from 'react';
import { Download, FileText, Plus, Save, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { money } from '../lib/format';
import { canEdit } from '../lib/permissions';
import { registrarValidacaoDocumento } from '../lib/validacao';
import { imprimirPlanejamentoFinanceiro } from '../lib/printDocs';
import PageShell from '../components/PageShell';
import StatCard from '../components/StatCard';
import EmptyState from '../components/EmptyState';

const mesAtual = () => new Date().toISOString().slice(0, 7);
const quatroFundosVazios = () => Array.from({ length: 4 }, (_, i) => ({ nome: '', percentual: '', ordem: i }));
const formInicial = () => ({
  id: null,
  titulo: `Planejamento Orçamentário ${new Date().getFullYear()}`,
  mes_inicio: mesAtual(),
  mes_fim: `${new Date().getFullYear()}-12`,
  valor_mensalidade: '25',
  associados_previstos: '',
  taxa_operacional: '0.99',
  status: 'ativo',
  observacoes: '',
  fundos: quatroFundosVazios(),
  receitas: []
});

function numero(valor) {
  if (valor === null || valor === undefined || valor === '') return 0;
  return Number(String(valor).replace(',', '.')) || 0;
}

function arredondar(valor) {
  return Math.round((Number(valor) || 0) * 100) / 100;
}

function mesesEntre(inicio, fim) {
  if (!inicio || !fim) return [];
  const [anoI, mesI] = inicio.split('-').map(Number);
  const [anoF, mesF] = fim.split('-').map(Number);
  if (!anoI || !mesI || !anoF || !mesF) return [];
  const atual = new Date(anoI, mesI - 1, 1);
  const limite = new Date(anoF, mesF - 1, 1);
  const meses = [];
  while (atual <= limite && meses.length < 120) {
    meses.push(`${atual.getFullYear()}-${String(atual.getMonth() + 1).padStart(2, '0')}`);
    atual.setMonth(atual.getMonth() + 1);
  }
  return meses;
}

function mesLabel(mes) {
  if (!mes) return '-';
  const [ano, m] = String(mes).split('-').map(Number);
  if (!ano || !m) return mes;
  return new Date(ano, m - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
}

function distribuir(valor, fundos, regra = 'percentual', fundoDestinoId = '') {
  const resultado = Object.fromEntries(fundos.map(f => [f.nome, 0]));
  const valorBase = arredondar(valor);
  if (!fundos.length || valorBase <= 0) return resultado;

  if (regra === 'igual') {
    const parte = arredondar(valorBase / fundos.length);
    fundos.forEach((f, index) => {
      resultado[f.nome] = index === fundos.length - 1
        ? arredondar(valorBase - fundos.slice(0, -1).reduce((acc, item) => acc + (resultado[item.nome] || 0), 0))
        : parte;
    });
    return resultado;
  }

  if (regra === 'fundo_especifico' && fundoDestinoId) {
    const fundo = fundos.find(f => String(f.id || f.nome) === String(fundoDestinoId) || f.nome === fundoDestinoId);
    if (fundo) resultado[fundo.nome] = valorBase;
    return resultado;
  }

  fundos.forEach((f, index) => {
    resultado[f.nome] = index === fundos.length - 1
      ? arredondar(valorBase - fundos.slice(0, -1).reduce((acc, item) => acc + (resultado[item.nome] || 0), 0))
      : arredondar(valorBase * Number(f.percentual || 0) / 100);
  });
  return resultado;
}

export function calcularPlanejamento(form) {
  const meses = mesesEntre(form.mes_inicio, form.mes_fim);
  const taxaMensalidade = numero(form.taxa_operacional);
  const valorMensalidade = numero(form.valor_mensalidade) || 25;
  const associadosPrevistos = Math.max(0, Math.round(numero(form.associados_previstos)));
  const fundos = (form.fundos || [])
    .map((f, index) => ({ ...f, id: f.id || f.nome || `fundo-${index}`, nome: String(f.nome || '').trim(), percentual: numero(f.percentual), ordem: f.ordem ?? index }))
    .filter(f => f.nome && f.percentual > 0);
  const receitas = (form.receitas || [])
    .map((r, index) => ({
      ...r,
      descricao: String(r.descricao || '').trim(),
      valor_estimado: numero(r.valor_estimado),
      recorrente: Boolean(r.recorrente),
      mes_alvo: r.mes_alvo || '',
      regra_distribuicao: r.regra_distribuicao || 'percentual',
      fundo_destino_id: r.fundo_destino_id || '',
      ordem: r.ordem ?? index
    }))
    .filter(r => r.descricao && r.valor_estimado > 0);

  const totaisFundos = Object.fromEntries(fundos.map(f => [f.nome, 0]));
  let totalBruto = 0;
  let totalTaxas = 0;
  let totalLiquido = 0;
  let totalExtras = 0;

  const mesesResumo = meses.map(mes => {
    const brutoMensalidades = arredondar(associadosPrevistos * valorMensalidade);
    const taxasMensalidades = arredondar(associadosPrevistos * taxaMensalidade);
    const liquidoMensalidades = arredondar(Math.max(brutoMensalidades - taxasMensalidades, 0));
    const distribuicaoMes = distribuir(liquidoMensalidades, fundos, 'percentual');
    const receitasExtras = [];
    let extrasMes = 0;

    receitas.forEach(receita => {
      const entraNoMes = receita.recorrente || receita.mes_alvo === mes;
      if (!entraNoMes) return;
      const valor = arredondar(receita.valor_estimado);
      extrasMes = arredondar(extrasMes + valor);
      const dist = distribuir(valor, fundos, receita.regra_distribuicao, receita.fundo_destino_id);
      Object.entries(dist).forEach(([nome, v]) => { distribuicaoMes[nome] = arredondar((distribuicaoMes[nome] || 0) + v); });
      receitasExtras.push({ ...receita, valor, distribuicao: dist });
    });

    Object.entries(distribuicaoMes).forEach(([nome, v]) => { totaisFundos[nome] = arredondar((totaisFundos[nome] || 0) + v); });

    const totalMes = arredondar(liquidoMensalidades + extrasMes);
    totalBruto = arredondar(totalBruto + brutoMensalidades + extrasMes);
    totalTaxas = arredondar(totalTaxas + taxasMensalidades);
    totalLiquido = arredondar(totalLiquido + totalMes);
    totalExtras = arredondar(totalExtras + extrasMes);

    return {
      mes,
      label: mesLabel(mes),
      associados: associadosPrevistos,
      valor_mensalidade: valorMensalidade,
      bruto_mensalidades: brutoMensalidades,
      taxas_mensalidades: taxasMensalidades,
      liquido_mensalidades: liquidoMensalidades,
      entradas_extras: extrasMes,
      total_mes: totalMes,
      receitas_extras: receitasExtras,
      distribuicao_mes: distribuicaoMes,
      acumulado_fundos: { ...totaisFundos }
    };
  });

  const receitasProcessadas = receitas.map(receita => {
    const ocorrencias = receita.recorrente ? meses : (receita.mes_alvo && meses.includes(receita.mes_alvo) ? [receita.mes_alvo] : []);
    const bruto = arredondar(receita.valor_estimado * ocorrencias.length);
    return { ...receita, ocorrencias, qtd: ocorrencias.length, bruto, taxas: 0, liquido: bruto };
  });

  return {
    meses,
    mesesResumo,
    fundos,
    receitas: receitasProcessadas,
    associadosPrevistos,
    valorMensalidade,
    taxaMensalidade,
    totalBruto,
    totalTaxas,
    totalLiquido,
    totalExtras,
    totaisFundos
  };
}

export default function PlanejamentoFinanceiro({ profile }) {
  const [lista, setLista] = useState([]);
  const [form, setForm] = useState(formInicial());
  const [loading, setLoading] = useState(false);
  const [associadosAtivos, setAssociadosAtivos] = useState(0);
  const podeEditar = canEdit(profile, 'financeiro');
  const editando = Boolean(form.id);

  useEffect(() => { carregar(); }, []);

  async function carregar() {
    setLoading(true);
    const [{ data, error }, { count, error: countError }] = await Promise.all([
      supabase.from('planejamentos_financeiros').select('*, planejamento_fundos(*), planejamento_receitas(*)').order('created_at', { ascending: false }),
      supabase.from('associados').select('id', { count: 'exact', head: true }).eq('status', 'aprovado')
    ]);
    if (error) alert('Erro ao carregar planejamentos: ' + error.message);
    if (countError) console.warn(countError.message);
    setLista(data || []);
    setAssociadosAtivos(count || 0);
    setForm(prev => ({ ...prev, associados_previstos: prev.associados_previstos || String(count || 0) }));
    setLoading(false);
  }

  const calculo = useMemo(() => calcularPlanejamento(form), [form]);
  const somaPercentual = useMemo(() => (form.fundos || []).reduce((acc, f) => acc + numero(f.percentual), 0), [form.fundos]);
  const somaValida = Math.abs(somaPercentual - 100) < 0.001;
  const formularioValido = form.titulo && form.mes_inicio && form.mes_fim && calculo.fundos.length > 0 && somaValida;

  function limpar() { setForm({ ...formInicial(), associados_previstos: String(associadosAtivos || 0) }); }
  function atualizarFundo(index, campo, valor) { const fundos = [...form.fundos]; fundos[index] = { ...fundos[index], [campo]: valor }; setForm({ ...form, fundos }); }
  function removerFundo(index) { const fundos = form.fundos.filter((_, i) => i !== index).map((f, i) => ({ ...f, ordem: i })); setForm({ ...form, fundos: fundos.length ? fundos : quatroFundosVazios() }); }
  function adicionarFundo() { setForm({ ...form, fundos: [...form.fundos, { nome: '', percentual: '', ordem: form.fundos.length }] }); }
  function atualizarReceita(index, campo, valor) { const receitas = [...form.receitas]; receitas[index] = { ...receitas[index], [campo]: valor }; setForm({ ...form, receitas }); }
  function adicionarReceita() { setForm({ ...form, receitas: [...form.receitas, { descricao: '', valor_estimado: '', recorrente: true, mes_alvo: form.mes_inicio, regra_distribuicao: 'percentual', fundo_destino_id: '', observacoes: '', ordem: form.receitas.length }] }); }
  function removerReceita(index) { setForm({ ...form, receitas: form.receitas.filter((_, i) => i !== index).map((r, i) => ({ ...r, ordem: i })) }); }

  function editar(plano) {
    setForm({
      id: plano.id,
      titulo: plano.titulo || '',
      mes_inicio: plano.mes_inicio || mesAtual(),
      mes_fim: plano.mes_fim || mesAtual(),
      valor_mensalidade: String(plano.valor_mensalidade ?? '25'),
      associados_previstos: String(plano.associados_previstos ?? associadosAtivos ?? ''),
      taxa_operacional: String(plano.taxa_operacional ?? '0.99'),
      status: plano.status || 'ativo',
      observacoes: plano.observacoes || '',
      fundos: (plano.planejamento_fundos || []).sort((a, b) => (a.ordem || 0) - (b.ordem || 0)).map(f => ({ id: f.id, nome: f.nome, percentual: String(f.percentual), ordem: f.ordem || 0 })) || quatroFundosVazios(),
      receitas: (plano.planejamento_receitas || []).sort((a, b) => (a.ordem || 0) - (b.ordem || 0)).map(r => ({
        id: r.id,
        descricao: r.descricao,
        valor_estimado: String(r.valor_estimado),
        recorrente: Boolean(r.recorrente),
        mes_alvo: r.mes_alvo || '',
        regra_distribuicao: r.regra_distribuicao || 'percentual',
        fundo_destino_id: r.fundo_destino_id || '',
        observacoes: r.observacoes || '',
        ordem: r.ordem || 0
      })) || []
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function salvar(e) {
    e.preventDefault();
    if (!podeEditar) return;
    if (!formularioValido) return alert('Confira os fundos: a soma das porcentagens precisa ser exatamente 100%.');

    const payload = {
      titulo: form.titulo,
      mes_inicio: form.mes_inicio,
      mes_fim: form.mes_fim,
      valor_mensalidade: numero(form.valor_mensalidade) || 25,
      associados_previstos: Math.max(0, Math.round(numero(form.associados_previstos))),
      taxa_operacional: numero(form.taxa_operacional),
      observacoes: form.observacoes || null,
      status: form.status || 'ativo',
      atualizado_por_nome: profile?.nome || profile?.email || null,
      atualizado_por_email: profile?.email || null,
      updated_at: new Date().toISOString()
    };

    let planejamentoId = form.id;
    if (editando) {
      const { error } = await supabase.from('planejamentos_financeiros').update(payload).eq('id', form.id);
      if (error) return alert('Erro ao atualizar planejamento: ' + error.message);
    } else {
      const { data, error } = await supabase.from('planejamentos_financeiros').insert({ ...payload, cadastrado_por_nome: profile?.nome || profile?.email || null, cadastrado_por_email: profile?.email || null }).select('*').single();
      if (error) return alert('Erro ao salvar planejamento: ' + error.message);
      planejamentoId = data.id;
    }

    await supabase.from('planejamento_fundos').delete().eq('planejamento_id', planejamentoId);
    await supabase.from('planejamento_receitas').delete().eq('planejamento_id', planejamentoId);

    const fundosPayload = calculo.fundos.map((f, index) => ({ planejamento_id: planejamentoId, nome: f.nome, percentual: f.percentual, ordem: index }));
    const { data: fundosInseridos, error: fundosError } = await supabase.from('planejamento_fundos').insert(fundosPayload).select('*');
    if (fundosError) return alert('Erro ao salvar fundos: ' + fundosError.message);

    const mapaNomeParaId = Object.fromEntries((fundosInseridos || []).map(f => [f.nome, f.id]));
    const receitasPayload = (form.receitas || []).filter(r => String(r.descricao || '').trim() && numero(r.valor_estimado) > 0).map((r, index) => ({
      planejamento_id: planejamentoId,
      descricao: r.descricao,
      valor_estimado: numero(r.valor_estimado),
      recorrente: Boolean(r.recorrente),
      mes_alvo: r.recorrente ? null : (r.mes_alvo || form.mes_inicio),
      regra_distribuicao: r.regra_distribuicao || 'percentual',
      fundo_destino_id: r.regra_distribuicao === 'fundo_especifico' ? (mapaNomeParaId[r.fundo_destino_id] || r.fundo_destino_id || null) : null,
      observacoes: r.observacoes || null,
      ordem: index
    }));
    if (receitasPayload.length) {
      const { error } = await supabase.from('planejamento_receitas').insert(receitasPayload);
      if (error) return alert('Erro ao salvar receitas esperadas: ' + error.message);
    }

    alert('Planejamento financeiro salvo com sucesso.');
    limpar();
    await carregar();
  }

  async function excluir(plano) {
    if (!podeEditar) return;
    if (!confirm(`Excluir o planejamento "${plano.titulo}"?`)) return;
    const { error } = await supabase.from('planejamentos_financeiros').delete().eq('id', plano.id);
    if (error) alert('Erro ao excluir: ' + error.message);
    await carregar();
  }

  async function gerarPdf(plano) {
    const planoNormalizado = { ...plano, fundos: plano.planejamento_fundos || [], receitas: plano.planejamento_receitas || [] };
    const calculoPlano = calcularPlanejamento({
      ...plano,
      associados_previstos: plano.associados_previstos || associadosAtivos || 0,
      valor_mensalidade: plano.valor_mensalidade || 25,
      fundos: (plano.planejamento_fundos || []).map(f => ({ id: f.id, nome: f.nome, percentual: f.percentual, ordem: f.ordem })),
      receitas: (plano.planejamento_receitas || []).map(r => ({ id: r.id, descricao: r.descricao, valor_estimado: r.valor_estimado, recorrente: r.recorrente, mes_alvo: r.mes_alvo, regra_distribuicao: r.regra_distribuicao, fundo_destino_id: r.fundo_destino_id, observacoes: r.observacoes, ordem: r.ordem }))
    });
    const validacao = await registrarValidacaoDocumento({
      tipo_documento: 'Planejamento Financeiro',
      titulo: plano.titulo,
      codigo_referencia: `${plano.mes_inicio} a ${plano.mes_fim}`,
      emitido_por_nome: profile?.nome || profile?.email || 'AAC',
      emitido_por_email: profile?.email || '',
      dados_publicos: {
        tipo: 'Planejamento Financeiro',
        periodo: `${mesLabel(plano.mes_inicio)} a ${mesLabel(plano.mes_fim)}`,
        associados_previstos: calculoPlano.associadosPrevistos,
        receitas_liquidas_previstas: calculoPlano.totalLiquido,
        fundos: calculoPlano.fundos.map(f => `${f.nome} (${f.percentual}%)`)
      }
    });
    await imprimirPlanejamentoFinanceiro(planoNormalizado, calculoPlano, profile, validacao.data);
  }

  return (
    <PageShell eyebrow="Tesouraria" title="Planejamento Financeiro" description="Planeje mês a mês as mensalidades, receitas extras e saldos acumulados por fundos." action={<button className="btn-secondary" onClick={carregar}>{loading ? 'Carregando...' : 'Atualizar'}</button>}>
      <div className="mb-7 grid gap-5 md:grid-cols-4">
        <StatCard title="Associados ativos" value={String(associadosAtivos)} subtitle="puxado automaticamente" />
        <StatCard title="Receita bruta prevista" value={money(calculo.totalBruto)} subtitle="mensalidades + extras" />
        <StatCard title="Taxas previstas" value={money(calculo.totalTaxas)} subtitle="somente mensalidades" />
        <StatCard title="Líquido previsto" value={money(calculo.totalLiquido)} subtitle="distribuível nos fundos" />
      </div>

      {podeEditar && (
        <form onSubmit={salvar} className="card mb-7 p-5">
          <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <h2 className="text-xl font-black text-floresta">{editando ? 'Editar planejamento' : 'Novo planejamento'}</h2>
              <p className="text-sm font-semibold text-slate-500">A taxa de R$ 0,99 é considerada apenas sobre mensalidades de associados.</p>
            </div>
            {editando && <button type="button" className="btn-secondary" onClick={limpar}>Cancelar edição</button>}
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="xl:col-span-2"><label className="label">Título do planejamento</label><input className="field" value={form.titulo} onChange={e => setForm({ ...form, titulo: e.target.value })} required /></div>
            <div><label className="label">Mês/Ano de início</label><input type="month" className="field" value={form.mes_inicio} onChange={e => setForm({ ...form, mes_inicio: e.target.value })} required /></div>
            <div><label className="label">Mês/Ano de término</label><input type="month" className="field" value={form.mes_fim} onChange={e => setForm({ ...form, mes_fim: e.target.value })} required /></div>
            <div><label className="label">Associados pagantes previstos</label><input className="field" value={form.associados_previstos} onChange={e => setForm({ ...form, associados_previstos: e.target.value })} placeholder={String(associadosAtivos)} /></div>
            <div><label className="label">Mensalidade padrão</label><input className="field" value={form.valor_mensalidade} onChange={e => setForm({ ...form, valor_mensalidade: e.target.value })} placeholder="25,00" /></div>
            <div><label className="label">Taxa boleto por mensalidade</label><input className="field" value={form.taxa_operacional} onChange={e => setForm({ ...form, taxa_operacional: e.target.value })} placeholder="0,99" /></div>
            <div><label className="label">Status</label><select className="field" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}><option value="ativo">Ativo</option><option value="rascunho">Rascunho</option><option value="encerrado">Encerrado</option><option value="cancelado">Cancelado</option></select></div>
            <div className="md:col-span-2 xl:col-span-4"><label className="label">Observações</label><input className="field" value={form.observacoes} onChange={e => setForm({ ...form, observacoes: e.target.value })} placeholder="Critérios, deliberação, observações da Tesouraria..." /></div>
          </div>

          <div className="mt-7 rounded-3xl bg-creme p-5">
            <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div><h3 className="text-lg font-black text-floresta">Fundos e distribuição percentual</h3><p className="text-sm font-semibold text-slate-600">A soma precisa fechar exatamente 100%.</p></div>
              <div className={`rounded-2xl px-4 py-2 text-sm font-black ${somaValida ? 'bg-green-100 text-green-700' : 'bg-red-50 text-red-700'}`}>Total: {somaPercentual.toFixed(2).replace('.', ',')}%</div>
            </div>
            <div className="space-y-3">
              {form.fundos.map((fundo, index) => (
                <div key={index} className="grid gap-3 rounded-2xl bg-white p-3 ring-1 ring-slate-100 md:grid-cols-[1fr_160px_auto]">
                  <input className="field" value={fundo.nome} onChange={e => atualizarFundo(index, 'nome', e.target.value)} placeholder={`Nome do fundo ${index + 1}`} />
                  <input className="field" value={fundo.percentual} onChange={e => atualizarFundo(index, 'percentual', e.target.value)} placeholder="%" inputMode="decimal" />
                  <button type="button" className="rounded-2xl bg-red-50 px-4 py-3 font-bold text-red-700" onClick={() => removerFundo(index)}><Trash2 size={16}/></button>
                </div>
              ))}
            </div>
            <button type="button" className="btn-secondary mt-4" onClick={adicionarFundo}><Plus size={18}/> Adicionar novo fundo</button>
          </div>

          <div className="mt-7 rounded-3xl bg-white p-5 ring-1 ring-slate-100">
            <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div><h3 className="text-lg font-black text-floresta">Previsão de receitas extras</h3><p className="text-sm font-semibold text-slate-600">Não desconta taxa de boleto. A regra de distribuição é escolhida por receita.</p></div>
              <button type="button" className="btn-secondary" onClick={adicionarReceita}><Plus size={18}/> Adicionar receita esperada</button>
            </div>
            {form.receitas.length === 0 ? <EmptyState>Nenhuma receita extra adicionada.</EmptyState> : (
              <div className="space-y-3">
                {form.receitas.map((receita, index) => (
                  <div key={index} className="grid gap-3 rounded-2xl bg-creme p-3 md:grid-cols-[1fr_120px_130px_135px_170px_auto]">
                    <input className="field" value={receita.descricao} onChange={e => atualizarReceita(index, 'descricao', e.target.value)} placeholder="Descrição da entrada" />
                    <input className="field" value={receita.valor_estimado} onChange={e => atualizarReceita(index, 'valor_estimado', e.target.value)} placeholder="Valor" inputMode="decimal" />
                    <select className="field" value={receita.recorrente ? 'sim' : 'nao'} onChange={e => atualizarReceita(index, 'recorrente', e.target.value === 'sim')}><option value="sim">Recorrente</option><option value="nao">Esporádica</option></select>
                    <input type="month" className="field" value={receita.mes_alvo || form.mes_inicio} disabled={receita.recorrente} onChange={e => atualizarReceita(index, 'mes_alvo', e.target.value)} />
                    <select className="field" value={receita.regra_distribuicao || 'percentual'} onChange={e => atualizarReceita(index, 'regra_distribuicao', e.target.value)}>
                      <option value="percentual">Percentuais dos fundos</option>
                      <option value="igual">Dividir igualmente</option>
                      <option value="fundo_especifico">100% para um fundo</option>
                    </select>
                    <button type="button" className="rounded-2xl bg-red-50 px-4 py-3 font-bold text-red-700" onClick={() => removerReceita(index)}><Trash2 size={16}/></button>
                    {receita.regra_distribuicao === 'fundo_especifico' && <select className="field md:col-span-6" value={receita.fundo_destino_id || ''} onChange={e => atualizarReceita(index, 'fundo_destino_id', e.target.value)}><option value="">Selecione o fundo destino</option>{calculo.fundos.map(f => <option key={f.nome} value={f.nome}>{f.nome}</option>)}</select>}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-7 overflow-hidden rounded-3xl border border-slate-100">
            <div className="bg-floresta px-5 py-3 font-black text-white">Prévia mês a mês</div>
            <div className="table-wrap"><table className="table"><thead><tr><th>Mês</th><th>Mensalidades brutas</th><th>Taxas</th><th>Líquido mensalidades</th><th>Extras</th><th>Total do mês</th></tr></thead><tbody>
              {calculo.mesesResumo.map(m => <tr key={m.mes}><td><strong>{m.label}</strong></td><td>{money(m.bruto_mensalidades)}</td><td>{money(m.taxas_mensalidades)}</td><td>{money(m.liquido_mensalidades)}</td><td>{money(m.entradas_extras)}</td><td className="font-black">{money(m.total_mes)}</td></tr>)}
            </tbody></table></div>
          </div>

          <button className="btn-primary mt-5" disabled={!formularioValido}><Save size={18} /> Salvar planejamento</button>
        </form>
      )}

      {lista.length === 0 ? <EmptyState>Nenhum planejamento cadastrado.</EmptyState> : (
        <div className="grid gap-5 xl:grid-cols-2">
          {lista.map(plano => {
            const planoCalc = calcularPlanejamento({ ...plano, fundos: plano.planejamento_fundos || [], receitas: plano.planejamento_receitas || [] });
            return <article key={plano.id} className="card p-5">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div><h3 className="text-xl font-black text-floresta">{plano.titulo}</h3><p className="text-sm font-semibold text-slate-500">{mesLabel(plano.mes_inicio)} a {mesLabel(plano.mes_fim)}</p></div>
                <span className="badge bg-green-50 text-green-700">{plano.status}</span>
              </div>
              <div className="mb-4 grid gap-3 md:grid-cols-3"><div className="rounded-2xl bg-creme p-3"><small className="font-black uppercase text-terra">Associados</small><p className="font-black text-floresta">{plano.associados_previstos || 0}</p></div><div className="rounded-2xl bg-creme p-3"><small className="font-black uppercase text-terra">Líquido previsto</small><p className="font-black text-floresta">{money(planoCalc.totalLiquido)}</p></div><div className="rounded-2xl bg-creme p-3"><small className="font-black uppercase text-terra">Taxas</small><p className="font-black text-floresta">{money(planoCalc.totalTaxas)}</p></div></div>
              <div className="flex flex-wrap gap-2"><button className="btn-secondary" onClick={() => gerarPdf(plano)}><FileText size={18}/> Gerar PDF</button>{podeEditar && <button className="btn-secondary" onClick={() => editar(plano)}>Editar</button>}{podeEditar && <button className="rounded-2xl bg-red-50 px-4 py-2 font-bold text-red-700" onClick={() => excluir(plano)}>Excluir</button>}</div>
            </article>;
          })}
        </div>
      )}
    </PageShell>
  );
}
