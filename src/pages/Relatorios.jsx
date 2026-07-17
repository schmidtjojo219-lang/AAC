import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, FileDown, RefreshCcw } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { money, dateBR } from '../lib/format';
import { imprimirRelatorioFinanceiro, imprimirRelatorioInadimplencia } from '../lib/printDocs';
import PageShell from '../components/PageShell';
import StatCard from '../components/StatCard';
import EmptyState from '../components/EmptyState';

function diasAtraso(vencimento, status) {
  if (!vencimento || ['pago', 'cancelado', 'isento'].includes(status)) return 0;
  const hoje = new Date();
  const v = new Date(`${vencimento}T00:00:00`);
  const diff = Math.floor((hoje - v) / 86400000);
  return Math.max(diff, 0);
}

function valorDevido(m) {
  return Math.max(Number(m.valor || 0) + Number(m.juros || 0) - Number(m.desconto || 0), 0);
}

export default function Relatorios() {
  const mesAtual = new Date().toISOString().slice(0, 7);
  const [periodo, setPeriodo] = useState(mesAtual);
  const [financeiro, setFinanceiro] = useState([]);
  const [mensalidades, setMensalidades] = useState([]);
  const [todasMensalidades, setTodasMensalidades] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => { carregar(); }, [periodo]);

  async function carregar() {
    setLoading(true);
    const inicio = `${periodo}-01`;
    const fimDate = new Date(`${periodo}-01T00:00:00`);
    fimDate.setMonth(fimDate.getMonth() + 1);
    const fim = fimDate.toISOString().slice(0, 10);
    const [{ data: fin }, { data: mens }, { data: todas }] = await Promise.all([
      supabase.from('financeiro').select('*').gte('data_movimento', inicio).lt('data_movimento', fim).order('data_movimento', { ascending: true }),
      supabase.from('mensalidades').select('*, associados(nome_completo, cpf, matricula, numero_ficha)').eq('competencia', periodo).order('created_at', { ascending: true }),
      supabase.from('mensalidades').select('*, associados(nome_completo, cpf, matricula, numero_ficha)').order('data_vencimento', { ascending: true })
    ]);
    setFinanceiro(fin || []);
    setMensalidades(mens || []);
    setTodasMensalidades(todas || []);
    setLoading(false);
  }

  const totais = useMemo(() => {
    const entradas = financeiro.filter(f => f.tipo === 'entrada').reduce((acc, f) => acc + Number(f.valor || 0), 0);
    const saidas = financeiro.filter(f => f.tipo === 'saida').reduce((acc, f) => acc + Number(f.valor || 0), 0);
    const mensalidadesPagas = mensalidades.filter(m => m.status === 'pago').reduce((acc, m) => acc + Number(m.valor_pago || valorDevido(m)), 0);
    const mensalidadesAbertas = mensalidades.filter(m => !['pago', 'cancelado', 'isento'].includes(m.status)).reduce((acc, m) => acc + valorDevido(m), 0);
    const recibos = mensalidades.filter(m => m.numero_recibo).length;
    const isentas = mensalidades.filter(m => m.status === 'isento').reduce((acc, m) => acc + Number(m.valor || 0), 0);
    return { entradas, saidas, saldo: entradas - saidas, mensalidadesPagas, mensalidadesAbertas, recibos, isentas };
  }, [financeiro, mensalidades]);

  const inadimplentes = useMemo(() => {
    const map = new Map();
    todasMensalidades.forEach(m => {
      const vencida = !['pago', 'cancelado', 'isento'].includes(m.status) && (m.status === 'atrasado' || diasAtraso(m.data_vencimento, m.status) > 0);
      if (!vencida) return;
      const atual = map.get(m.associado_id) || {
        associado: m.associados?.nome_completo || '-',
        matricula: m.associados?.matricula || m.associados?.numero_ficha || '-',
        parcelasVencidas: 0,
        valorVencido: 0,
        ultimoVencimento: null
      };
      atual.parcelasVencidas += 1;
      atual.valorVencido += valorDevido(m);
      atual.ultimoVencimento = !atual.ultimoVencimento || m.data_vencimento > atual.ultimoVencimento ? m.data_vencimento : atual.ultimoVencimento;
      map.set(m.associado_id, atual);
    });
    return Array.from(map.values()).sort((a, b) => b.parcelasVencidas - a.parcelasVencidas || b.valorVencido - a.valorVencido);
  }, [todasMensalidades]);

  function imprimir() {
    imprimirRelatorioFinanceiro({
      titulo: 'Relatório Mensal da Tesouraria e Conselho Fiscal',
      periodo,
      financeiro,
      mensalidades,
      totais
    });
  }

  function imprimirInadimplencia() {
    imprimirRelatorioInadimplencia({
      titulo: 'Relatório de Inadimplência - Conselho Fiscal',
      itens: inadimplentes,
      dataReferencia: new Date()
    });
  }

  return (
    <PageShell eyebrow="Prestação de contas" title="Relatórios" description="Gere relatórios mensais para Diretoria Executiva e Conselho Fiscal, com lançamentos, mensalidades, recibos, isenções e inadimplência." action={<button className="btn-secondary" onClick={carregar}><RefreshCcw size={16}/> {loading ? 'Atualizando...' : 'Atualizar'}</button>}>
      <div className="card mb-7 p-5">
        <div className="grid gap-4 md:grid-cols-3">
          <div><label className="label">Período</label><input type="month" className="field" value={periodo} onChange={e => setPeriodo(e.target.value)} /></div>
          <div className="md:col-span-2 flex flex-wrap items-end gap-3"><button className="btn-primary" onClick={imprimir}><FileDown size={18}/> Relatório mensal em PDF</button><button className="btn-secondary" onClick={imprimirInadimplencia}><AlertTriangle size={18}/> Relatório de inadimplência</button></div>
        </div>
      </div>

      <div className="mb-7 grid gap-5 md:grid-cols-3 xl:grid-cols-6">
        <StatCard title="Entradas" value={money(totais.entradas)} />
        <StatCard title="Saídas" value={money(totais.saidas)} />
        <StatCard title="Saldo" value={money(totais.saldo)} />
        <StatCard title="Mens. pagas" value={money(totais.mensalidadesPagas)} />
        <StatCard title="Mens. abertas" value={money(totais.mensalidadesAbertas)} />
        <StatCard title="Recibos" value={totais.recibos} subtitle="emitidos no período" />
      </div>

      {inadimplentes.some(i => i.parcelasVencidas >= 3) && (
        <div className="mb-7 rounded-3xl border border-red-100 bg-red-50 p-5 text-red-800">
          <div className="flex items-center gap-2 font-black"><AlertTriangle size={20}/> Casos críticos para análise</div>
          <p className="mt-2 text-sm">Há {inadimplentes.filter(i => i.parcelasVencidas >= 3).length} associado(s) com 3 ou mais parcelas vencidas. Gere o relatório de inadimplência para análise da Diretoria e do Conselho Fiscal.</p>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-2">
        <section>
          <h2 className="mb-3 text-2xl font-black text-floresta">Lançamentos financeiros</h2>
          {financeiro.length === 0 ? <EmptyState>Sem lançamentos no período.</EmptyState> : <div className="table-wrap"><table className="table"><thead><tr><th>Data</th><th>Tipo</th><th>Categoria</th><th>Descrição</th><th>Valor</th></tr></thead><tbody>{financeiro.map(f => <tr key={f.id}><td>{dateBR(f.data_movimento)}</td><td>{f.tipo}</td><td>{f.categoria || '-'}</td><td>{f.descricao}</td><td>{money(f.valor)}</td></tr>)}</tbody></table></div>}
        </section>
        <section>
          <h2 className="mb-3 text-2xl font-black text-floresta">Mensalidades do período</h2>
          {mensalidades.length === 0 ? <EmptyState>Sem mensalidades no período.</EmptyState> : <div className="table-wrap"><table className="table"><thead><tr><th>Associado</th><th>Status</th><th>Vencimento</th><th>Devido</th><th>Pago/Recibo</th></tr></thead><tbody>{mensalidades.map(m => <tr key={m.id}><td>{m.associados?.nome_completo || '-'}<br/><span className="text-xs text-slate-500">{m.associados?.matricula || m.associados?.numero_ficha || '-'}</span></td><td>{m.status}</td><td>{dateBR(m.data_vencimento)}</td><td>{money(valorDevido(m))}</td><td>{m.status === 'pago' ? <>{money(m.valor_pago || valorDevido(m))}<br/><span className="text-xs text-slate-500">{m.numero_recibo || 'Sem recibo'}</span></> : '-'}</td></tr>)}</tbody></table></div>}
        </section>
      </div>
    </PageShell>
  );
}
