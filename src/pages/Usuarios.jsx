import { useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { PERFIS, canEdit } from '../lib/permissions';
import PageShell from '../components/PageShell';
import EmptyState from '../components/EmptyState';

export default function Usuarios({ profile }) {
  const [profiles, setProfiles] = useState([]);
  const [form, setForm] = useState({ id: '', nome: '', email: '', perfil: 'consulta', ativo: true });
  const podeEditar = canEdit(profile, 'usuarios') || profile?.perfil === 'admin' || profile?.perfil === 'presidencia';

  useEffect(() => { carregar(); }, []);

  async function carregar() {
    const { data } = await supabase.from('profiles').select('*').order('nome');
    setProfiles(data || []);
  }

  async function salvar(e) {
    e.preventDefault();
    if (!podeEditar) return;
    const { error } = await supabase.from('profiles').upsert(form);
    if (error) alert('Erro ao salvar: ' + error.message);
    setForm({ id: '', nome: '', email: '', perfil: 'consulta', ativo: true });
    await carregar();
  }

  return (
    <PageShell eyebrow="Administração" title="Usuários e permissões" description="Controle os perfis internos depois de criar os usuários no Supabase Authentication." action={<button className="btn-secondary" onClick={carregar}>Atualizar</button>}>
      <div className="mb-7 rounded-3xl border border-amber-200 bg-amber-50 p-5 text-amber-900">
        <strong>Importante:</strong> primeiro crie o usuário no Supabase em Authentication &gt; Users. Depois copie o UUID do usuário e cadastre aqui com o perfil correto.
      </div>

      {podeEditar && (
        <form onSubmit={salvar} className="card mb-7 p-5">
          <h2 className="mb-5 text-xl font-black text-floresta">Vincular perfil ao usuário</h2>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div><label className="label">UUID do usuário</label><input className="field" value={form.id} onChange={e => setForm({...form, id: e.target.value})} required /></div>
            <div><label className="label">Nome</label><input className="field" value={form.nome} onChange={e => setForm({...form, nome: e.target.value})} required /></div>
            <div><label className="label">E-mail</label><input className="field" type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} required /></div>
            <div><label className="label">Perfil</label><select className="field" value={form.perfil} onChange={e => setForm({...form, perfil: e.target.value})}>{Object.entries(PERFIS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></div>
          </div>
          <button className="btn-primary mt-5"><Save size={18}/> Salvar perfil</button>
        </form>
      )}

      {profiles.length === 0 ? <EmptyState>Nenhum perfil cadastrado ainda.</EmptyState> : (
        <div className="table-wrap"><table className="table"><thead><tr><th>Nome</th><th>E-mail</th><th>Perfil</th><th>Status</th></tr></thead><tbody>{profiles.map(p => <tr key={p.id}><td><strong className="text-floresta">{p.nome}</strong></td><td>{p.email}</td><td>{PERFIS[p.perfil] || p.perfil}</td><td>{p.ativo ? 'Ativo' : 'Inativo'}</td></tr>)}</tbody></table></div>
      )}
    </PageShell>
  );
}
