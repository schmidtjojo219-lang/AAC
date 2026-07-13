import { useEffect, useState } from 'react';
import { ExternalLink, FileText, RefreshCw, Save, Trash2, Upload, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { dateBR } from '../lib/format';
import { canEdit } from '../lib/permissions';
import { uploadArquivo, abrirArquivoPrivado } from '../lib/storage';
import PageShell from '../components/PageShell';
import EmptyState from '../components/EmptyState';

const inicial = {
  id: null,
  titulo: '',
  tipo: 'Ata',
  data_documento: new Date().toISOString().slice(0, 10),
  url_arquivo: '',
  arquivo_path: '',
  visibilidade: 'diretoria',
  descricao: ''
};

function erroSupabase(error) {
  return [error?.message, error?.details ? `Detalhes: ${error.details}` : '', error?.hint ? `Dica: ${error.hint}` : '', error?.code ? `Código: ${error.code}` : ''].filter(Boolean).join('\n') || 'Erro desconhecido.';
}

function limpar(payload) {
  const p = { ...payload };
  if (p.data_documento === '') p.data_documento = null;
  return p;
}

export default function Documentos({ profile }) {
  const [lista, setLista] = useState([]);
  const [form, setForm] = useState(inicial);
  const [arquivo, setArquivo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const podeEditar = canEdit(profile, 'documentos');
  const editando = Boolean(form.id);

  useEffect(() => { carregar(); }, []);

  async function carregar() {
    setLoading(true);
    setMsg('');
    const { data, error } = await supabase.from('documentos').select('*').order('data_documento', { ascending: false });
    if (error) setMsg('Não foi possível carregar documentos. Execute sql/atualizacao-v6-3-v6-4.sql no Supabase.\n' + erroSupabase(error));
    else setLista(data || []);
    setLoading(false);
  }

  function limparForm() {
    setForm(inicial);
    setArquivo(null);
  }

  async function salvar(e) {
    e.preventDefault();
    if (!podeEditar) return;
    setLoading(true);
    setMsg('');
    try {
      let arquivo_path = form.arquivo_path || '';
      if (arquivo) {
        const { path, error } = await uploadArquivo(arquivo, 'documentos');
        if (error) throw error;
        arquivo_path = path;
      }
      const payload = limpar({ ...form, arquivo_path, atualizado_por_nome: profile?.nome || profile?.email || '', atualizado_por_email: profile?.email || '', updated_at: new Date().toISOString() });
      if (!editando) {
        payload.cadastrado_por_nome = profile?.nome || profile?.email || '';
        payload.cadastrado_por_email = profile?.email || '';
      }
      delete payload.id; delete payload.created_at;
      const { error } = editando
        ? await supabase.from('documentos').update(payload).eq('id', form.id)
        : await supabase.from('documentos').insert(payload);
      if (error) throw error;
      setMsg(editando ? 'Documento atualizado com sucesso.' : 'Documento salvo com sucesso.');
      limparForm();
      await carregar();
    } catch (error) { alert('Erro ao salvar documento:\n' + erroSupabase(error)); }
    finally { setLoading(false); }
  }

  async function excluir(id) {
    if (!podeEditar || !confirm('Excluir documento?')) return;
    const { error } = await supabase.from('documentos').delete().eq('id', id);
    if (error) alert('Erro ao excluir:\n' + erroSupabase(error));
    await carregar();
  }

  function abrir(doc) {
    if (doc.arquivo_path) return abrirArquivoPrivado(doc.arquivo_path);
    if (doc.url_arquivo) return window.open(doc.url_arquivo, '_blank', 'noopener,noreferrer');
  }

  return (
    <PageShell eyebrow="Arquivo institucional" title="Documentos" description="Registre atas, estatuto, pareceres, comprovantes e documentos oficiais com link externo ou anexo interno." action={<button className="btn-secondary" onClick={carregar}><RefreshCw size={17}/> {loading ? 'Carregando...' : 'Atualizar'}</button>}>
      {msg && <div className="mb-5 whitespace-pre-line rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm font-bold text-amber-800">{msg}</div>}
      {podeEditar && (
        <form onSubmit={salvar} className="card mb-7 p-5">
          <div className="mb-5 flex items-center justify-between gap-3"><h2 className="flex items-center gap-2 text-xl font-black text-floresta"><FileText size={20}/> {editando ? 'Editar documento' : 'Novo documento'}</h2>{editando && <button type="button" className="btn-secondary" onClick={limparForm}><X size={16}/> Cancelar</button>}</div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="md:col-span-2"><label className="label">Título</label><input className="field" value={form.titulo || ''} onChange={e => setForm({...form, titulo: e.target.value})} required /></div>
            <div><label className="label">Tipo</label><select className="field" value={form.tipo || ''} onChange={e => setForm({...form, tipo: e.target.value})}><option>Ata</option><option>Estatuto</option><option>Comprovante</option><option>Parecer</option><option>Contrato</option><option>Certidão</option><option>Ofício</option><option>Outro</option></select></div>
            <div><label className="label">Data</label><input type="date" className="field" value={form.data_documento || ''} onChange={e => setForm({...form, data_documento: e.target.value})} /></div>
            <div className="md:col-span-2"><label className="label">Link externo do arquivo</label><input className="field" value={form.url_arquivo || ''} onChange={e => setForm({...form, url_arquivo: e.target.value})} placeholder="https://drive.google.com/..." /></div>
            <div className="md:col-span-2"><label className="label">Arquivo interno</label><input type="file" accept="application/pdf,image/*,.doc,.docx,.xls,.xlsx" className="field" onChange={e => setArquivo(e.target.files?.[0] || null)} />{arquivo && <p className="mt-1 text-xs font-bold text-floresta">Selecionado: {arquivo.name}</p>}</div>
            <div><label className="label">Visibilidade</label><select className="field" value={form.visibilidade || 'diretoria'} onChange={e => setForm({...form, visibilidade: e.target.value})}><option value="diretoria">Diretoria</option><option value="conselho_fiscal">Conselho Fiscal</option><option value="todos">Todos</option></select></div>
            <div className="flex items-end"><button type="button" className="btn-secondary w-full" disabled={!form.arquivo_path && !form.url_arquivo} onClick={() => abrir(form)}><Upload size={16}/> Abrir arquivo atual</button></div>
            <div className="md:col-span-2 xl:col-span-4"><label className="label">Descrição</label><textarea className="field" value={form.descricao || ''} onChange={e => setForm({...form, descricao: e.target.value})}></textarea></div>
          </div>
          <button className="btn-primary mt-5" disabled={loading}><Save size={18} /> {editando ? 'Salvar alterações' : 'Salvar documento'}</button>
        </form>
      )}

      {lista.length === 0 ? <EmptyState>Nenhum documento cadastrado.</EmptyState> : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {lista.map(doc => <article key={doc.id} className="card p-5"><div className="flex items-start justify-between gap-3"><div><span className="badge bg-creme text-floresta">{doc.tipo}</span><h3 className="mt-3 text-xl font-black text-floresta">{doc.titulo}</h3></div>{podeEditar && <button className="rounded-xl bg-red-50 p-2 text-red-700" onClick={() => excluir(doc.id)}><Trash2 size={16}/></button>}</div><p className="mt-2 text-sm text-slate-500">{dateBR(doc.data_documento)} • {doc.visibilidade}</p><p className="mt-3 text-slate-700">{doc.descricao || 'Sem descrição.'}</p><div className="mt-4 flex flex-wrap gap-2">{(doc.url_arquivo || doc.arquivo_path) && <button type="button" onClick={() => abrir(doc)} className="btn-secondary">{doc.arquivo_path ? <Upload size={16}/> : <ExternalLink size={16}/>} Abrir arquivo</button>}{podeEditar && <button type="button" onClick={() => { setForm({ ...inicial, ...doc }); setArquivo(null); window.scrollTo({top:0, behavior:'smooth'}); }} className="btn-secondary"><FileText size={16}/> Editar</button>}</div>{!doc.url_arquivo && !doc.arquivo_path && <p className="mt-4 text-sm font-bold text-slate-400"><FileText size={16} className="inline"/> Sem anexo/link</p>}</article>)}
        </div>
      )}
    </PageShell>
  );
}
