import { useEffect, useMemo, useState } from 'react';
import { ClipboardCopy, Download, Save, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { dateBR } from '../lib/format';
import { canEdit } from '../lib/permissions';
import { BUCKET_PUBLICO, uploadArquivo } from '../lib/storage';
import PageShell from '../components/PageShell';
import EmptyState from '../components/EmptyState';

const inicial = { titulo: '', categoria: 'Institucional', data_publicacao: new Date().toISOString().slice(0, 10), resumo: '', conteudo: '', imagem_url: '', publicada: true };

function slug(texto) {
  return (texto || 'noticia-aac').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function gerarNoticiasJs(lista) {
  const publicadas = lista.filter(n => n.publicada).map(n => ({
    id: slug(n.titulo),
    titulo: n.titulo,
    data: n.data_publicacao,
    categoria: n.categoria || 'Institucional',
    imagem: n.imagem_url || 'logo.png',
    imagemAlt: n.titulo,
    resumo: n.resumo,
    conteudo: String(n.conteudo || '').split('\n').filter(Boolean)
  }));
  return `window.NOTICIAS_AAC = ${JSON.stringify(publicadas, null, 2)};\n`;
}

export default function Noticias({ profile }) {
  const [lista, setLista] = useState([]);
  const [form, setForm] = useState(inicial);
  const [arquivoImagem, setArquivoImagem] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const podeEditar = canEdit(profile, 'noticias');

  useEffect(() => { carregar(); }, []);

  async function carregar() {
    setLoading(true);
    const { data } = await supabase.from('noticias').select('*').order('data_publicacao', { ascending: false });
    setLista(data || []);
    setLoading(false);
  }

  async function salvar(e) {
    e.preventDefault();
    if (!podeEditar) return;
    setLoading(true);
    let imagem_url = form.imagem_url;
    if (arquivoImagem) {
      const { path, error } = await uploadArquivo(arquivoImagem, 'noticias/imagens', BUCKET_PUBLICO);
      if (error) {
        alert('Erro ao enviar imagem: ' + error.message);
        setLoading(false);
        return;
      }
      const { data } = supabase.storage.from(BUCKET_PUBLICO).getPublicUrl(path);
      imagem_url = data?.publicUrl || imagem_url;
    }
    const { error } = await supabase.from('noticias').insert({ ...form, imagem_url });
    if (error) alert('Erro ao salvar: ' + error.message);
    setForm(inicial);
    setArquivoImagem(null);
    await carregar();
    setLoading(false);
  }

  async function excluir(id) {
    if (!podeEditar) return;
    if (!confirm('Excluir notícia?')) return;
    const { error } = await supabase.from('noticias').delete().eq('id', id);
    if (error) alert('Erro ao excluir: ' + error.message);
    await carregar();
  }

  const noticiasJs = useMemo(() => gerarNoticiasJs(lista), [lista]);

  async function copiarNoticiasJs() {
    await navigator.clipboard.writeText(noticiasJs);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2500);
  }

  function baixarNoticiasJs() {
    const blob = new Blob([noticiasJs], { type: 'text/javascript;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'noticias.js';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <PageShell eyebrow="Comunicação" title="Notícias" description="Cadastre notícias no painel. As publicações marcadas como publicadas aparecem automaticamente no site público da AAC." action={<button className="btn-secondary" onClick={carregar}>{loading ? 'Carregando...' : 'Atualizar'}</button>}>
      {podeEditar && (
        <>
          <form onSubmit={salvar} className="card mb-7 p-5">
            <h2 className="mb-5 text-xl font-black text-floresta">Nova notícia</h2>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="md:col-span-2"><label className="label">Título</label><input className="field" value={form.titulo} onChange={e => setForm({...form, titulo: e.target.value})} required /></div>
              <div><label className="label">Categoria</label><input className="field" value={form.categoria} onChange={e => setForm({...form, categoria: e.target.value})} /></div>
              <div><label className="label">Data</label><input type="date" className="field" value={form.data_publicacao} onChange={e => setForm({...form, data_publicacao: e.target.value})} /></div>
              <div className="md:col-span-2"><label className="label">Imagem URL</label><input className="field" value={form.imagem_url} onChange={e => setForm({...form, imagem_url: e.target.value})} placeholder="https://... ou uploads/foto.jpg" /></div>
              <div><label className="label">Ou anexar imagem</label><input type="file" accept="image/*" className="field" onChange={e => setArquivoImagem(e.target.files?.[0] || null)} /></div>
              <div><label className="label">Publicada?</label><select className="field" value={String(form.publicada)} onChange={e => setForm({...form, publicada: e.target.value === 'true'})}><option value="true">Sim</option><option value="false">Não</option></select></div>
              <div className="md:col-span-2 xl:col-span-4"><label className="label">Resumo</label><textarea className="field" value={form.resumo} onChange={e => setForm({...form, resumo: e.target.value})} required></textarea></div>
              <div className="md:col-span-2 xl:col-span-4"><label className="label">Conteúdo</label><textarea className="field" rows="6" value={form.conteudo} onChange={e => setForm({...form, conteudo: e.target.value})}></textarea></div>
            </div>
            <button className="btn-primary mt-5"><Save size={18} /> Salvar notícia</button>
          </form>

          <div className="card mb-7 p-5">
            <h2 className="text-xl font-black text-floresta">Integração com o site público</h2>
            <p className="mt-2 text-slate-600">A nova versão do site público lê as notícias diretamente do Supabase. O arquivo noticias.js abaixo fica apenas como alternativa manual/backup.</p>
            <div className="mt-4 flex flex-wrap gap-3"><button className="btn-secondary" onClick={copiarNoticiasJs}><ClipboardCopy size={16}/> {copiado ? 'Copiado!' : 'Copiar noticias.js'}</button><button className="btn-secondary" onClick={baixarNoticiasJs}><Download size={16}/> Baixar noticias.js</button></div>
            <textarea className="field mt-4 h-44 font-mono text-xs" readOnly value={noticiasJs}></textarea>
          </div>
        </>
      )}

      {lista.length === 0 ? <EmptyState>Nenhuma notícia cadastrada.</EmptyState> : (
        <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
          {lista.map(n => <article key={n.id} className="card overflow-hidden"><img src={n.imagem_url || '/logo.png'} alt="" className="h-48 w-full object-cover bg-creme" onError={e => { e.currentTarget.src = '/logo.png'; }} /><div className="p-5"><div className="flex items-center justify-between"><span className="badge bg-creme text-floresta">{n.categoria}</span>{podeEditar && <button className="rounded-xl bg-red-50 p-2 text-red-700" onClick={() => excluir(n.id)}><Trash2 size={16}/></button>}</div><h3 className="mt-3 text-xl font-black text-floresta">{n.titulo}</h3><p className="mt-1 text-sm text-slate-500">{dateBR(n.data_publicacao)} • {n.publicada ? 'Publicada' : 'Rascunho'}</p><p className="mt-3 text-slate-700">{n.resumo}</p></div></article>)}
        </div>
      )}
    </PageShell>
  );
}
