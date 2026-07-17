import { useEffect, useMemo, useState } from 'react';
import { Save, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { dateBR, money } from '../lib/format';
import { canEdit } from '../lib/permissions';
import PageShell from '../components/PageShell';
import StatCard from '../components/StatCard';
import EmptyState from '../components/EmptyState';

const inicial = {
  tipo: 'entrada',
  data_movimento: new Date().toISOString().slice(0, 10),
  descricao: '',
  categoria: '',
  valor: '',
  forma_pagamento: '',
  comprovante_url: '',
  planejamento_id: '',
  fundo_id: '',
  distribuicao: 'percentual',
  taxa_operacional: '0'
};

function numero(valor) {
  if (valor === null || valor === undefined || valor === '') return 0;
  return Number(String(valor).replace(',', '.')) || 0;
}

function arredondar(valor) {
  return Math.round((Number(valor) || 0) * 100) / 100;
}

export default function Financeiro({ profile }) {
  const [lista, setLista] = useState([]);
  const [planejamentos, setPlanejamentos] = useState([]);
  const [form, setForm] = useState(inicial);
  const [loading, setLoading] = useState(false);
  const podeEditar = canEdit(profile, 'financeiro');

  useEffect(() => { carregar(); }, []);

  async function carregar() {
    setLoading(true);
    const [{ data: financeiroData, error }, { data: planejamentosData }] = await Promise.all([
      supabase.from('financeiro').select('*').order('data_movimento', { ascending: false }).order('created_at', { ascending: false }),
      supabase.from('planejamentos_financeiros').select('*, planejamento_fundos(*)').order('created_at', { ascending: false })
    ]);
    if (error) alert('Erro ao carregar financeiro: ' + error.message);
    setLista(financeiroData || []);
    setPlanejamentos(planejamentosData || []);
    setLoading(false);
  }

  const planejamentoSelecionado = useMemo(() => planejamentos.find(p => p.id === form.planejamento_id) || null, [planejamentos, form.planejamento_id]);
  const fundosDisponiveis = useMemo(() => (planejamentoSelecionado?.planejamento_fundos || []).sort((a, b) => (a.ordem || 0) - (b.ordem || 0)), [planejamentoSelecionado]);
  const planejamentoVigente = useMemo(() => planejamentos.find(p => p.status === 'ativo') || planejamentos[0] || null, [planejamentos]);
  const fundosVigentes = useMemo(() => (planejamentoVigente?.planejamento_fundos || []).slice().sort((a, b) => (a.ordem || 0) - (b.ordem || 0)), [planejamentoVigente]);

  const total = useMemo(() => {
    const entradas = lista.filter(i => i.tipo === 'entrada').reduce((acc, i) => acc + Number(i.valor || 0), 0);
    const taxasBoleto = lista.filter(i => i.origem === 'taxa_boleto_mensalidade').reduce((acc, i) => acc + Number(i.valor || 0), 0);
    const saidasOperacionais = lista.filter(i => i.tipo === 'saida' && i.origem !== 'taxa_boleto_mensalidade').reduce((acc, i) => acc + Number(i.valor || 0), 0);
    const taxasEmEntradas = lista.filter(i => i.tipo === 'entrada').reduce((acc, i) => acc + Number(i.taxa_operacional || 0), 0);
    const taxas = Math.max(taxasBoleto, taxasEmEntradas);
    const bruto = lista.filter(i => i.tipo === 'entrada').reduce((acc, i) => acc + Number(i.valor_bruto || i.valor || 0), 0);
    return { entradas, saidas: saidasOperacionais, saldo: entradas - saidasOperacionais, taxas, bruto };
  }, [lista]);

  const saldosFundos = useMemo(() => {
    return fundosVigentes.map(fundo => {
      const saldo = lista
        .filter(item => item.fundo_id === fundo.id || (!item.fundo_id && item.fundo_nome === fundo.nome))
        .reduce((acc, item) => item.tipo === 'entrada' ? acc + Number(item.valor || 0) : acc - Number(item.valor || 0), 0);
      return { ...fundo, saldo };
    });
  }, [fundosVigentes, lista]);

  function limparForm() {
    setForm(inicial);
  }

  function selecionarPlanejamento(id) {
    setForm({ ...form, planejamento_id: id, fundo_id: '', taxa_operacional: '0' });
  }

  async function salvar(e) {
    e.preventDefault();
    if (!podeEditar) return;

    const valorBruto = numero(form.valor);
    if (valorBruto <= 0) return alert('Informe um valor válido.');

    const base = {
      data_movimento: form.data_movimento,
      categoria: form.categoria || null,
      forma_pagamento: form.forma_pagamento || null,
      comprovante_url: form.comprovante_url || null,
      planejamento_id: form.planejamento_id || null
    };

    if (form.tipo === 'entrada' && form.planejamento_id && planejamentoSelecionado && form.distribuicao === 'percentual') {
      if (!fundosDisponiveis.length) return alert('O planejamento selecionado não possui fundos cadastrados.');
      const taxaTotal = Math.min(valorBruto, numero(form.taxa_operacional));
      const liquidoTotal = Math.max(valorBruto - taxaTotal, 0);
      const grupo = crypto.randomUUID();
      const payloads = fundosDisponiveis.map((fundo, index) => {
        const percentual = Number(fundo.percentual || 0);
        const valor = index === fundosDisponiveis.length - 1
          ? arredondar(liquidoTotal - fundosDisponiveis.slice(0, -1).reduce((acc, f) => acc + arredondar(liquidoTotal * Number(f.percentual || 0) / 100), 0))
          : arredondar(liquidoTotal * percentual / 100);
        return {
          ...base,
          tipo: 'entrada',
          descricao: `${form.descricao} — ${fundo.nome}`,
          valor,
          valor_bruto: arredondar(valorBruto * percentual / 100),
          taxa_operacional: arredondar(taxaTotal * percentual / 100),
          valor_liquido: valor,
          fundo_id: fundo.id,
          fundo_nome: fundo.nome,
          grupo_distribuicao_id: grupo
        };
      }).filter(item => item.valor > 0);

      const { error } = await supabase.from('financeiro').insert(payloads);
      if (error) return alert('Erro ao distribuir receita: ' + error.message);
      alert('Receita líquida distribuída entre os fundos do planejamento.');
    } else {
      let fundo = null;
      if (form.planejamento_id && form.fundo_id) fundo = fundosDisponiveis.find(f => f.id === form.fundo_id) || null;
      if (form.tipo === 'saida' && form.planejamento_id && !fundo) return alert('Para despesas vinculadas a um planejamento, selecione o fundo de onde a saída será deduzida.');
      if (form.tipo === 'entrada' && form.planejamento_id && form.distribuicao === 'fundo' && !fundo) return alert('Selecione o fundo de destino da entrada.');

      const payload = {
        ...base,
        tipo: form.tipo,
        descricao: form.descricao,
        valor: valorBruto,
        valor_bruto: form.tipo === 'entrada' ? valorBruto : null,
        taxa_operacional: form.tipo === 'entrada' ? 0 : 0,
        valor_liquido: form.tipo === 'entrada' ? valorBruto : null,
        fundo_id: fundo?.id || null,
        fundo_nome: fundo?.nome || null
      };
      const { error } = await supabase.from('financeiro').insert(payload);
      if (error) return alert('Erro ao salvar: ' + error.message);
    }

    limparForm();
    await carregar();
  }

  async function excluir(id) {
    if (!podeEditar) return;
    if (!confirm('Excluir lançamento financeiro?')) return;
    const { error } = await supabase.from('financeiro').delete().eq('id', id);
    if (error) alert('Erro ao excluir: ' + error.message);
    await carregar();
  }

  return (
    <PageShell eyebrow="Tesouraria" title="Financeiro" description="Controle de entradas, saídas, saldo e distribuição por fundos do planejamento financeiro." action={<button className="btn-secondary" onClick={carregar}>{loading ? 'Carregando...' : 'Atualizar'}</button>}>
      <div className="mb-7 grid gap-5 md:grid-cols-4">
        <StatCard title="Entradas líquidas" value={money(total.entradas)} subtitle="receitas já distribuídas" />
        <StatCard title="Saídas operacionais" value={money(total.saidas)} subtitle="sem contar taxa do boleto" />
        <StatCard title="Taxas boleto" value={money(total.taxas)} subtitle="mensalidades via Asaas" />
        <StatCard title="Saldo líquido" value={money(total.saldo)} subtitle="entradas líquidas - despesas" />
      </div>

      {saldosFundos.length > 0 && (
        <div className="mb-7">
          <div className="mb-3 flex flex-col gap-1">
            <h2 className="text-xl font-black text-floresta">Fundos do planejamento vigente</h2>
            <p className="text-sm font-semibold text-slate-500">{planejamentoVigente?.titulo || 'Planejamento ativo'} - saldos calculados pelos lançamentos vinculados aos fundos.</p>
          </div>
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {saldosFundos.map(fundo => <StatCard key={fundo.id} title={fundo.nome} value={money(fundo.saldo)} subtitle={`${Number(fundo.percentual || 0).toLocaleString('pt-BR')}% do planejamento`} />)}
          </div>
        </div>
      )}

      {podeEditar && (
        <form onSubmit={salvar} className="card mb-7 p-5">
          <h2 className="mb-5 text-xl font-black text-floresta">Novo lançamento</h2>
          <div className="mb-5 rounded-3xl bg-creme p-4 text-sm font-semibold text-slate-600">
            Entradas manuais vinculadas a planejamento são distribuídas entre os fundos. A taxa de R$ 0,99 é lançada automaticamente somente quando uma mensalidade é marcada como paga na aba Mensalidades. Em uma saída, selecione obrigatoriamente o fundo de onde o valor será deduzido.
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div><label className="label">Tipo</label><select className="field" value={form.tipo} onChange={e => setForm({...form, tipo: e.target.value, fundo_id: ''})}><option value="entrada">Entrada</option><option value="saida">Saída</option></select></div>
            <div><label className="label">Data</label><input type="date" className="field" value={form.data_movimento} onChange={e => setForm({...form, data_movimento: e.target.value})} /></div>
            <div><label className="label">Valor bruto / valor da despesa</label><input className="field" value={form.valor} onChange={e => setForm({...form, valor: e.target.value})} placeholder="0,00" required /></div>
            <div><label className="label">Taxa manual, se houver</label><input className="field" value={form.taxa_operacional} disabled={form.tipo !== 'entrada'} onChange={e => setForm({...form, taxa_operacional: e.target.value})} placeholder="0,00" /></div>

            <div className="md:col-span-2"><label className="label">Planejamento financeiro</label><select className="field" value={form.planejamento_id} onChange={e => selecionarPlanejamento(e.target.value)}><option value="">Sem planejamento/fundo</option>{planejamentos.map(p => <option key={p.id} value={p.id}>{p.titulo}</option>)}</select></div>
            <div><label className="label">Distribuição da entrada</label><select className="field" value={form.distribuicao} disabled={form.tipo !== 'entrada'} onChange={e => setForm({...form, distribuicao: e.target.value, fundo_id: ''})}><option value="percentual">Automática por percentuais</option><option value="fundo">Destinar a um fundo</option></select></div>
            <div><label className="label">Fundo da entrada/saída</label><select className="field" value={form.fundo_id} disabled={!form.planejamento_id || (form.tipo === 'entrada' && form.distribuicao === 'percentual')} onChange={e => setForm({...form, fundo_id: e.target.value})}><option value="">{form.tipo === 'entrada' && form.distribuicao === 'percentual' ? 'Distribuição automática' : 'Selecione o fundo'}</option>{fundosDisponiveis.map(f => <option key={f.id} value={f.id}>{f.nome} — {Number(f.percentual).toLocaleString('pt-BR')}%</option>)}</select></div>

            <div><label className="label">Categoria</label><input className="field" value={form.categoria} onChange={e => setForm({...form, categoria: e.target.value})} placeholder="Mensalidade, doação, despesa..." /></div>
            <div><label className="label">Forma de pagamento</label><input className="field" value={form.forma_pagamento} onChange={e => setForm({...form, forma_pagamento: e.target.value})} /></div>
            <div className="md:col-span-2"><label className="label">Descrição</label><input className="field" value={form.descricao} onChange={e => setForm({...form, descricao: e.target.value})} required /></div>
            <div className="md:col-span-2 xl:col-span-4"><label className="label">Link comprovante</label><input className="field" value={form.comprovante_url} onChange={e => setForm({...form, comprovante_url: e.target.value})} placeholder="https://..." /></div>
          </div>
          <button className="btn-primary mt-5"><Save size={18} /> Salvar lançamento</button>
        </form>
      )}

      {lista.length === 0 ? <EmptyState>Nenhum lançamento financeiro cadastrado.</EmptyState> : (
        <div className="table-wrap"><table className="table"><thead><tr><th>Data</th><th>Descrição</th><th>Categoria/Fundo</th><th>Tipo</th><th>Bruto</th><th>Taxa</th><th>Valor</th><th></th></tr></thead><tbody>
          {lista.map(item => <tr key={item.id}><td>{dateBR(item.data_movimento)}</td><td><strong className="text-floresta">{item.descricao}</strong><br/>{item.comprovante_url && <a className="text-xs font-bold text-azul underline" href={item.comprovante_url} target="_blank">Ver comprovante</a>}</td><td>{item.categoria || '-'}<br/><span className="text-xs font-bold text-terra">{item.fundo_nome || 'Sem fundo'}</span></td><td><span className={`badge ${item.tipo === 'entrada' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>{item.tipo}</span></td><td>{item.tipo === 'entrada' ? money(item.valor_bruto || item.valor) : '-'}</td><td>{item.tipo === 'entrada' ? money(item.taxa_operacional || 0) : '-'}</td><td className="font-black">{money(item.valor)}</td><td>{podeEditar && <button className="rounded-xl bg-red-50 p-2 text-red-700" onClick={() => excluir(item.id)}><Trash2 size={16}/></button>}</td></tr>)}
        </tbody></table></div>
      )}
    </PageShell>
  );
}
