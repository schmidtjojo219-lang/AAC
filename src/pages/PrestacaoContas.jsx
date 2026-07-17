import { useEffect, useMemo, useState } from 'react';
import { Download, FileCheck2, RefreshCcw } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { dateBR, money } from '../lib/format';
import { registrarValidacaoDocumento } from '../lib/validacao';
import { imprimirPrestacaoContasFinanceira } from '../lib/printDocs';
import PageShell from '../components/PageShell';
import StatCard from '../components/StatCard';
import EmptyState from '../components/EmptyState';

const hoje = new Date();
const mesAtual = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;

function numero(valor) {
  return Number(valor || 0) || 0;
}

function fimDoMes(mes) {
  const [ano, m] = String(mes || mesAtual).split('-').map(Number);
  return new Date(ano, m, 0).toISOString().slice(0, 10);
}

function inicioDoMes(mes) {
  return `${mes || mesAtual}-01`;
}

function mesLabel(mes) {
  if (!mes) return '-';
  const [ano, m] = mes.split('-').map(Number);
  if (!ano || !m) return mes;
  return new Date(ano, m - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
}

function periodoPorTipo(tipo, baseMes = mesAtual) {
  const [ano, mes] = baseMes.split('-').map(Number);
  if (tipo === 'mensal') return { inicio: baseMes, fim: baseMes };
  if (tipo === 'trimestral') {
    const trimestreInicio = Math.floor((mes - 1) / 3) * 3 + 1;
    return { inicio: `${ano}-${String(trimestreInicio).padStart(2, '0')}`, fim: `${ano}-${String(trimestreInicio + 2).padStart(2, '0')}` };
  }
  if (tipo === 'semestral') {
    const inicio = mes <= 6 ? 1 : 7;
    return { inicio: `${ano}-${String(inicio).padStart(2, '0')}`, fim: `${ano}-${String(inicio + 5).padStart(2, '0')}` };
  }
  if (tipo === 'anual') return { inicio: `${ano}-01`, fim: `${ano}-12` };
  return { inicio: baseMes, fim: baseMes };
}

function calcularResumo(lancamentos = [], planejamento = null) {
  const fundosBase = (planejamento?.planejamento_fundos || []).map(f => f.nome);
  const mapa = new Map();
  fundosBase.forEach(nome => mapa.set(nome, { fundo: nome, entradas: 0, saidas: 0, bruto: 0, taxas: 0, liquido: 0, saldo: 0, qtd: 0 }));

  let entradas = 0;
  let saidas = 0;
  let bruto = 0;
  let taxasEntradas = 0;
  let taxasDebito = 0;
  let liquido = 0;

  lancamentos.forEach(item => {
    const valor = numero(item.valor);
    if (item.origem === 'taxa_boleto_mensalidade') {
      taxasDebito += valor;
      return;
    }
    const fundo = item.fundo_nome || item.categoria || 'Sem fundo vinculado';
    if (!mapa.has(fundo)) mapa.set(fundo, { fundo, entradas: 0, saidas: 0, bruto: 0, taxas: 0, liquido: 0, saldo: 0, qtd: 0 });
    const row = mapa.get(fundo);
    row.qtd += 1;
    if (item.tipo === 'entrada') {
      const itemBruto = numero(item.valor_bruto || item.valor);
      const itemTaxa = numero(item.taxa_operacional);
      const itemLiquido = numero(item.valor_liquido || item.valor);
      row.entradas += itemLiquido;
      row.bruto += itemBruto;
      row.taxas += itemTaxa;
      row.liquido += itemLiquido;
      entradas += itemLiquido;
      bruto += itemBruto;
      taxasEntradas += itemTaxa;
      liquido += itemLiquido;
    } else {
      row.saidas += valor;
      saidas += valor;
    }
    row.saldo = row.entradas - row.saidas;
  });

  const taxas = Math.max(taxasEntradas, taxasDebito);
  const fundos = Array.from(mapa.values()).map(f => ({ ...f, saldo: f.entradas - f.saidas }));
  return { fundos, entradas, saidas, saldo: entradas - saidas, bruto, taxas, liquido, taxasDebito };
}

export default function PrestacaoContas({ profile }) {
  const [tipoPeriodo, setTipoPeriodo] = useState('mensal');
  const [mesBase, setMesBase] = useState(mesAtual);
  const [mesInicio, setMesInicio] = useState(mesAtual);
  const [mesFim, setMesFim] = useState(mesAtual);
  const [planejamentoId, setPlanejamentoId] = useState('');
  const [planejamentos, setPlanejamentos] = useState([]);
  const [lancamentos, setLancamentos] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => { carregarPlanejamentos(); }, []);
  useEffect(() => {
    if (tipoPeriodo !== 'personalizado') {
      const periodo = periodoPorTipo(tipoPeriodo, mesBase);
      setMesInicio(periodo.inicio);
      setMesFim(periodo.fim);
    }
  }, [tipoPeriodo, mesBase]);

  const planejamento = useMemo(() => planejamentos.find(p => p.id === planejamentoId) || null, [planejamentoId, planejamentos]);
  const resumo = useMemo(() => calcularResumo(lancamentos, planejamento), [lancamentos, planejamento]);

  async function carregarPlanejamentos() {
    const { data, error } = await supabase
      .from('planejamentos_financeiros')
      .select('*, planejamento_fundos(*), planejamento_receitas(*)')
      .order('created_at', { ascending: false });
    if (error) alert('Erro ao carregar planejamentos: ' + error.message);
    setPlanejamentos(data || []);
  }

  async function carregarLancamentos() {
    setLoading(true);
    let query = supabase
      .from('financeiro')
      .select('*')
      .gte('data_movimento', inicioDoMes(mesInicio))
      .lte('data_movimento', fimDoMes(mesFim))
      .order('data_movimento', { ascending: true });
    if (planejamentoId) query = query.eq('planejamento_id', planejamentoId);
    const { data, error } = await query;
    if (error) alert('Erro ao carregar lançamentos: ' + error.message);
    setLancamentos(data || []);
    setLoading(false);
  }

  async function gerarPdf() {
    const periodoTexto = `${mesLabel(mesInicio)} a ${mesLabel(mesFim)}`;
    const titulo = `Prestação de Contas — ${periodoTexto}`;
    const validacao = await registrarValidacaoDocumento({
      tipo_documento: 'Prestação de Contas',
      titulo,
      codigo_referencia: periodoTexto,
      emitido_por_nome: profile?.nome || profile?.email || 'AAC',
      emitido_por_email: profile?.email || '',
      dados_publicos: {
        tipo: 'Prestação de Contas',
        periodo: periodoTexto,
        planejamento: planejamento?.titulo || 'Sem planejamento vinculado',
        entradas: resumo.entradas,
        saidas: resumo.saidas,
        saldo: resumo.saldo
      }
    });
    await imprimirPrestacaoContasFinanceira({
      titulo,
      periodo: periodoTexto,
      tipoPeriodo,
      planejamento,
      lancamentos,
      resumo,
      emitidoPor: profile,
      validacao: validacao.data
    });
  }

  return (
    <PageShell eyebrow="Tesouraria" title="Prestação de Contas" description="Gere relatório formal por período, com receitas líquidas, taxas operacionais, fundos, despesas e validação pública." action={<button className="btn-secondary" onClick={carregarLancamentos}>{loading ? 'Carregando...' : 'Atualizar'}</button>}>
      <div className="mb-7 grid gap-5 md:grid-cols-4">
        <StatCard title="Entradas líquidas" value={money(resumo.entradas)} subtitle="no período selecionado" />
        <StatCard title="Saídas" value={money(resumo.saidas)} subtitle="despesas registradas" />
        <StatCard title="Taxas operacionais" value={money(resumo.taxas)} subtitle="boletos/operacional" />
        <StatCard title="Saldo final" value={money(resumo.saldo)} subtitle="entradas - saídas" />
      </div>

      <section className="card mb-7 p-5">
        <h2 className="mb-5 text-xl font-black text-floresta">Gerar prestação de contas</h2>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <div><label className="label">Tipo de período</label><select className="field" value={tipoPeriodo} onChange={e => setTipoPeriodo(e.target.value)}><option value="mensal">Mensal</option><option value="trimestral">Trimestral</option><option value="semestral">Semestral</option><option value="anual">Anual</option><option value="personalizado">Personalizado</option></select></div>
          <div><label className="label">Mês de referência</label><input type="month" className="field" value={mesBase} onChange={e => setMesBase(e.target.value)} /></div>
          <div><label className="label">Início</label><input type="month" className="field" value={mesInicio} disabled={tipoPeriodo !== 'personalizado'} onChange={e => setMesInicio(e.target.value)} /></div>
          <div><label className="label">Término</label><input type="month" className="field" value={mesFim} disabled={tipoPeriodo !== 'personalizado'} onChange={e => setMesFim(e.target.value)} /></div>
          <div><label className="label">Planejamento</label><select className="field" value={planejamentoId} onChange={e => setPlanejamentoId(e.target.value)}><option value="">Todos/sem filtro</option>{planejamentos.map(p => <option key={p.id} value={p.id}>{p.titulo}</option>)}</select></div>
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          <button className="btn-primary" onClick={carregarLancamentos}><RefreshCcw size={18}/> Carregar dados do período</button>
          <button className="btn-secondary" onClick={gerarPdf} disabled={lancamentos.length === 0}><FileCheck2 size={18}/> Gerar PDF validável</button>
        </div>
      </section>

      <section className="card mb-7 p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-xl font-black text-floresta">Resumo por fundo</h2>
          <span className="rounded-full bg-creme px-4 py-2 text-sm font-black text-terra">{mesLabel(mesInicio)} a {mesLabel(mesFim)}</span>
        </div>
        {resumo.fundos.length === 0 ? <EmptyState>Carregue um período para visualizar os fundos.</EmptyState> : (
          <div className="table-wrap"><table className="table"><thead><tr><th>Fundo</th><th>Entradas líquidas</th><th>Despesas</th><th>Saldo</th><th>Lançamentos</th></tr></thead><tbody>
            {resumo.fundos.map(f => <tr key={f.fundo}><td><strong className="text-floresta">{f.fundo}</strong></td><td>{money(f.entradas)}</td><td>{money(f.saidas)}</td><td className="font-black">{money(f.saldo)}</td><td>{f.qtd}</td></tr>)}
          </tbody></table></div>
        )}
      </section>

      {lancamentos.length === 0 ? <EmptyState>Nenhum lançamento carregado para o período selecionado.</EmptyState> : (
        <div className="table-wrap"><table className="table"><thead><tr><th>Data</th><th>Tipo</th><th>Descrição</th><th>Fundo</th><th>Bruto</th><th>Taxa</th><th>Valor</th></tr></thead><tbody>
          {lancamentos.map(item => <tr key={item.id}><td>{dateBR(item.data_movimento)}</td><td>{item.origem === 'taxa_boleto_mensalidade' ? 'taxa' : item.tipo}</td><td><strong className="text-floresta">{item.descricao}</strong><br/><span className="text-xs text-slate-500">{item.categoria || '-'}</span></td><td>{item.fundo_nome || '-'}</td><td>{item.tipo === 'entrada' ? money(item.valor_bruto || item.valor) : '-'}</td><td>{item.tipo === 'entrada' ? money(item.taxa_operacional || 0) : item.origem === 'taxa_boleto_mensalidade' ? money(item.valor) : '-'}</td><td className="font-black">{money(item.valor)}</td></tr>)}
        </tbody></table></div>
      )}
    </PageShell>
  );
}
