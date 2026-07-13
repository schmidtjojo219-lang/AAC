import { useEffect, useState } from 'react';
import { Save, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { dateBR, money } from '../lib/format';
import { canEdit } from '../lib/permissions';
import PageShell from '../components/PageShell';
import EmptyState from '../components/EmptyState';

const inicial = { periodo: '', titulo: '', parecer: '', status: 'em_analise' };

export default function ConselhoFiscal({ profile }) {
  const [pareceres, setPareceres] = useState([]);
  const [financeiro, setFinanceiro] = useState([]);
  const [form, setForm] = useState(inicial);
  const podeEditar = canEdit(profile, 'pareceres');

  useEffect(() => { carregar(); }, []);

  async function carregar() {
    const [{ data: p }, { data: f }] = await Promise.all([
      supabase.from('pareceres_fiscais').select('*').order('created_at', { ascending: false }),
      supabase.from('financeiro').select('*').order('data_movimento', { ascending: false }).limit(8)
    ]);
    setPareceres(p || []);
    setFinanceiro(f || []);
  }

  async function salvar(e) {
    e.preventDefault();
    if (!podeEditar) return;
    const { error } = await supabase.from('pareceres_fiscais').insert(form);
    if (error) alert('Erro ao salvar: ' + error.message);
    setForm(inicial);
    await carregar();
  }

  async function excluir(id) {
    if (!podeEditar) return;
    if (!confirm('Excluir parecer?')) return;
    const { error } = await supabase.from('pareceres_fiscais').delete().eq('id', id);
    if (error) alert('Erro ao excluir: ' + error.message);
    await carregar();
  }

  return (
    <PageShell eyebrow="Fiscalização" title="Conselho Fiscal" description="Área para acompanhar lançamentos financeiros, documentos e emitir pareceres." action={<button className="btn-secondary" onClick={carregar}>Atualizar</button>}>
      <div className="grid gap-7 xl:grid-cols-[1fr_1.2fr]">
        <div className="space-y-7">
          {podeEditar && (
            <form onSubmit={salvar} className="card p-5">
              <h2 className="mb-5 text-xl font-black text-floresta">Novo parecer</h2>
              <div className="space-y-4">
                <div><label className="label">Período analisado</label><input className="field" value={form.periodo} onChange={e => setForm({...form, periodo: e.target.value})} placeholder="Ex.: Junho/2026" required /></div>
                <div><label className="label">Título</label><input className="field" value={form.titulo} onChange={e => setForm({...form, titulo: e.target.value})} required /></div>
                <div><label className="label">Status</label><select className="field" value={form.status} onChange={e => setForm({...form, status: e.target.value})}><option value="em_analise">Em análise</option><option value="aprovado">Aprovado</option><option value="aprovado_com_ressalvas">Aprovado com ressalvas</option><option value="reprovado">Reprovado</option></select></div>
                <div><label className="label">Parecer</label><textarea className="field" rows="7" value={form.parecer} onChange={e => setForm({...form, parecer: e.target.value})} required></textarea></div>
              </div>
              <button className="btn-primary mt-5"><Save size={18}/> Salvar parecer</button>
            </form>
          )}

          <div className="card p-5">
            <h2 className="text-xl font-black text-floresta">Últimos lançamentos financeiros</h2>
            <div className="mt-4 space-y-3">
              {financeiro.map(item => <div key={item.id} className="rounded-2xl bg-creme p-3"><div className="flex items-center justify-between gap-3"><strong className="text-floresta">{item.descricao}</strong><span className="font-black">{money(item.valor)}</span></div><p className="text-sm text-slate-500">{dateBR(item.data_movimento)} • {item.tipo} • {item.categoria || '-'}</p></div>)}
              {financeiro.length === 0 && <p className="text-slate-500">Nenhum lançamento registrado.</p>}
            </div>
          </div>
        </div>

        <div>
          {pareceres.length === 0 ? <EmptyState>Nenhum parecer fiscal cadastrado.</EmptyState> : (
            <div className="space-y-4">
              {pareceres.map(p => <article key={p.id} className="card p-5"><div className="flex items-start justify-between gap-4"><div><span className="badge bg-creme text-floresta">{p.status}</span><h3 className="mt-3 text-xl font-black text-floresta">{p.titulo}</h3><p className="text-sm text-slate-500">{p.periodo} • {dateBR(p.created_at)}</p></div>{podeEditar && <button className="rounded-xl bg-red-50 p-2 text-red-700" onClick={() => excluir(p.id)}><Trash2 size={16}/></button>}</div><p className="mt-4 whitespace-pre-wrap text-slate-700">{p.parecer}</p></article>)}
            </div>
          )}
        </div>
      </div>
    </PageShell>
  );
}
