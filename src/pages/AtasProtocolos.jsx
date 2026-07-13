import { useEffect, useMemo, useState } from 'react';
import { ClipboardList, FileDown, FileText, FolderArchive, Printer, RefreshCw, Save, Search, Send, Trash2, Upload, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { canEdit } from '../lib/permissions';
import { uploadArquivo, abrirArquivoPrivado } from '../lib/storage';
import { dateBR } from '../lib/format';
import { imprimirAta, imprimirListaPresenca, imprimirRelatorioProtocolos } from '../lib/printDocs';
import { registrarValidacaoDocumento } from '../lib/validacao';
import PageShell from '../components/PageShell';
import EmptyState from '../components/EmptyState';

const hoje = () => new Date().toISOString().slice(0, 10);

const ataInicial = {
  id: null,
  tipo: 'Ata de Reunião da Diretoria Executiva',
  titulo: '',
  data_reuniao: hoje(),
  horario: '',
  local: 'Sede da AAC',
  presidencia: '',
  secretaria: '',
  pauta: '',
  deliberacoes: '',
  presentes: '',
  observacoes: '',
  status: 'rascunho'
};

const protocoloInicial = {
  id: null,
  numero_protocolo: '',
  orgao: '',
  assunto: '',
  data_envio: hoje(),
  prazo_resposta: '',
  responsavel: '',
  status: 'em_andamento',
  observacoes: '',
  arquivo_path: ''
};

const documentoInicial = {
  id: null,
  titulo: '',
  categoria: 'Institucional',
  tipo: 'PDF',
  data_documento: hoje(),
  visibilidade: 'diretoria',
  descricao: '',
  arquivo_path: '',
  url_arquivo: ''
};

function limparDatas(payload, campos = []) {
  const limpo = { ...payload };
  for (const campo of campos) if (limpo[campo] === '') limpo[campo] = null;
  return limpo;
}

function erroSupabase(error) {
  return [
    error?.message,
    error?.details ? `Detalhes: ${error.details}` : '',
    error?.hint ? `Dica: ${error.hint}` : '',
    error?.code ? `Código: ${error.code}` : ''
  ].filter(Boolean).join('\n') || 'Erro desconhecido.';
}

function badgeStatus(status = '') {
  const mapa = {
    rascunho: 'Rascunho', aprovada: 'Aprovada', arquivada: 'Arquivada',
    em_andamento: 'Em andamento', respondido: 'Respondido', pendente: 'Pendente', encerrado: 'Encerrado', atrasado: 'Atrasado',
    diretoria: 'Diretoria', conselho_fiscal: 'Conselho Fiscal', todos: 'Todos'
  };
  return mapa[status] || status || '-';
}

function filtrar(lista, termo, campos) {
  const q = String(termo || '').toLowerCase().trim();
  if (!q) return lista;
  return lista.filter((item) => campos.map((c) => item[c] || '').join(' ').toLowerCase().includes(q));
}

export default function AtasProtocolos({ profile }) {
  const [aba, setAba] = useState('atas');
  const [atas, setAtas] = useState([]);
  const [protocolos, setProtocolos] = useState([]);
  const [documentos, setDocumentos] = useState([]);
  const [ataForm, setAtaForm] = useState(ataInicial);
  const [protocoloForm, setProtocoloForm] = useState(protocoloInicial);
  const [documentoForm, setDocumentoForm] = useState(documentoInicial);
  const [arquivoProtocolo, setArquivoProtocolo] = useState(null);
  const [arquivoDocumento, setArquivoDocumento] = useState(null);
  const [busca, setBusca] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const podeEditar = canEdit(profile, 'atas') || canEdit(profile, 'documentos');

  useEffect(() => { carregar(); }, []);

  async function carregar() {
    setLoading(true);
    setMsg('');
    const [atasResp, protocolosResp, documentosResp] = await Promise.all([
      supabase.from('atas').select('*').order('data_reuniao', { ascending: false }),
      supabase.from('protocolos').select('*').order('data_envio', { ascending: false }),
      supabase.from('biblioteca_documentos').select('*').order('data_documento', { ascending: false })
    ]);

    const erros = [atasResp.error, protocolosResp.error, documentosResp.error].filter(Boolean);
    if (erros.length) {
      setMsg('Alguma parte não carregou. Execute no Supabase o arquivo sql/atualizacao-v6-3-v6-4.sql.\n' + erros.map(erroSupabase).join('\n---\n'));
    }
    setAtas(atasResp.data || []);
    setProtocolos(protocolosResp.data || []);
    setDocumentos(documentosResp.data || []);
    setLoading(false);
  }

  const atasFiltradas = useMemo(() => filtrar(atas, busca, ['titulo','tipo','pauta','deliberacoes','status']), [atas, busca]);
  const protocolosFiltrados = useMemo(() => filtrar(protocolos, busca, ['numero_protocolo','orgao','assunto','responsavel','status']), [protocolos, busca]);
  const documentosFiltrados = useMemo(() => filtrar(documentos, busca, ['titulo','categoria','tipo','descricao','visibilidade']), [documentos, busca]);

  function meta(editando = false) {
    const base = { atualizado_por_nome: profile?.nome || profile?.email || '', atualizado_por_email: profile?.email || '', updated_at: new Date().toISOString() };
    if (!editando) return { ...base, cadastrado_por_nome: profile?.nome || profile?.email || '', cadastrado_por_email: profile?.email || '' };
    return base;
  }

  function limparAta() { setAtaForm(ataInicial); setMsg(''); }
  function limparProtocolo() { setProtocoloForm(protocoloInicial); setArquivoProtocolo(null); setMsg(''); }
  function limparDocumento() { setDocumentoForm(documentoInicial); setArquivoDocumento(null); setMsg(''); }

  async function salvarAta(e) {
    e.preventDefault();
    if (!podeEditar) return;
    setLoading(true);
    try {
      const editando = Boolean(ataForm.id);
      const payload = limparDatas({ ...ataForm, ...meta(editando) }, ['data_reuniao']);
      delete payload.id; delete payload.created_at;
      const { error } = editando
        ? await supabase.from('atas').update(payload).eq('id', ataForm.id)
        : await supabase.from('atas').insert(payload);
      if (error) throw error;
      setMsg(editando ? 'Ata atualizada com sucesso.' : 'Ata cadastrada com sucesso.');
      limparAta();
      await carregar();
    } catch (error) { alert('Erro ao salvar ata:\n' + erroSupabase(error)); }
    finally { setLoading(false); }
  }

  async function salvarProtocolo(e) {
    e.preventDefault();
    if (!podeEditar) return;
    setLoading(true);
    try {
      const editando = Boolean(protocoloForm.id);
      let arquivo_path = protocoloForm.arquivo_path || '';
      if (arquivoProtocolo) {
        const { path, error } = await uploadArquivo(arquivoProtocolo, 'protocolos');
        if (error) throw error;
        arquivo_path = path;
      }
      const payload = limparDatas({ ...protocoloForm, arquivo_path, ...meta(editando) }, ['data_envio', 'prazo_resposta']);
      delete payload.id; delete payload.created_at;
      const { error } = editando
        ? await supabase.from('protocolos').update(payload).eq('id', protocoloForm.id)
        : await supabase.from('protocolos').insert(payload);
      if (error) throw error;
      setMsg(editando ? 'Protocolo atualizado com sucesso.' : 'Protocolo cadastrado com sucesso.');
      limparProtocolo();
      await carregar();
    } catch (error) { alert('Erro ao salvar protocolo:\n' + erroSupabase(error)); }
    finally { setLoading(false); }
  }

  async function salvarDocumento(e) {
    e.preventDefault();
    if (!podeEditar) return;
    setLoading(true);
    try {
      const editando = Boolean(documentoForm.id);
      let arquivo_path = documentoForm.arquivo_path || '';
      if (arquivoDocumento) {
        const { path, error } = await uploadArquivo(arquivoDocumento, 'biblioteca');
        if (error) throw error;
        arquivo_path = path;
      }
      const payload = limparDatas({ ...documentoForm, arquivo_path, ...meta(editando) }, ['data_documento']);
      delete payload.id; delete payload.created_at;
      const { error } = editando
        ? await supabase.from('biblioteca_documentos').update(payload).eq('id', documentoForm.id)
        : await supabase.from('biblioteca_documentos').insert(payload);
      if (error) throw error;
      setMsg(editando ? 'Documento atualizado com sucesso.' : 'Documento cadastrado com sucesso.');
      limparDocumento();
      await carregar();
    } catch (error) { alert('Erro ao salvar documento:\n' + erroSupabase(error)); }
    finally { setLoading(false); }
  }

  async function excluir(tabela, id) {
    if (!podeEditar || !confirm('Confirma a exclusão deste registro?')) return;
    const { error } = await supabase.from(tabela).delete().eq('id', id);
    if (error) alert('Erro ao excluir:\n' + erroSupabase(error));
    await carregar();
  }

  async function gerarAtaValidada(ata) {
    const validacao = await registrarValidacaoDocumento({
      tipo_documento: 'Ata',
      titulo: ata.titulo || ata.tipo || 'Ata AAC',
      codigo_referencia: ata.titulo || ata.id,
      ata_id: ata.id || null,
      emitido_por_nome: profile?.nome || profile?.email || '',
      emitido_por_email: profile?.email || '',
      dados_publicos: { titulo: ata.titulo || ata.tipo || 'Ata AAC', data: ata.data_reuniao || '', status: ata.status || '' }
    });
    imprimirAta(ata, profile, validacao.data);
  }

  return (
    <PageShell eyebrow="Secretaria" title="Atas, documentos e protocolos" description="Gere atas, listas de presença, controle protocolos enviados e organize a biblioteca documental da AAC." action={<button className="btn-secondary" onClick={carregar}><RefreshCw size={17}/> {loading ? 'Carregando...' : 'Atualizar'}</button>}>
      {msg && <div className="mb-5 whitespace-pre-line rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm font-bold text-amber-800">{msg}</div>}

      <div className="mb-5 grid gap-3 md:grid-cols-3">
        <button onClick={() => setAba('atas')} className={`rounded-3xl p-4 text-left font-black ring-1 ${aba === 'atas' ? 'bg-floresta text-white ring-floresta' : 'bg-white text-floresta ring-slate-100'}`}><ClipboardList className="mb-2"/> Atas e listas</button>
        <button onClick={() => setAba('protocolos')} className={`rounded-3xl p-4 text-left font-black ring-1 ${aba === 'protocolos' ? 'bg-floresta text-white ring-floresta' : 'bg-white text-floresta ring-slate-100'}`}><Send className="mb-2"/> Protocolos</button>
        <button onClick={() => setAba('biblioteca')} className={`rounded-3xl p-4 text-left font-black ring-1 ${aba === 'biblioteca' ? 'bg-floresta text-white ring-floresta' : 'bg-white text-floresta ring-slate-100'}`}><FolderArchive className="mb-2"/> Biblioteca documental</button>
      </div>

      <div className="mb-5 flex items-center gap-3 rounded-3xl bg-white p-3 ring-1 ring-slate-100"><Search size={18} className="text-slate-400"/><input value={busca} onChange={e => setBusca(e.target.value)} className="w-full bg-transparent font-semibold outline-none" placeholder="Pesquisar nesta área..."/></div>

      {aba === 'atas' && <>
        {podeEditar && <form onSubmit={salvarAta} className="card mb-7 p-5">
          <HeaderForm icon={<ClipboardList size={20}/>} title={ataForm.id ? 'Editar ata' : 'Nova ata'} onCancel={ataForm.id ? limparAta : null}/>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Campo label="Tipo"><select className="field" value={ataForm.tipo} onChange={e => setAtaForm({...ataForm, tipo: e.target.value})}><option>Ata de Reunião da Diretoria Executiva</option><option>Ata de Assembleia Geral</option><option>Ata de Prestação de Contas</option><option>Ata de Posse</option><option>Ata de Reunião Extraordinária</option></select></Campo>
            <Campo label="Data"><input type="date" className="field" value={ataForm.data_reuniao || ''} onChange={e => setAtaForm({...ataForm, data_reuniao: e.target.value})}/></Campo>
            <Campo label="Horário"><input className="field" value={ataForm.horario || ''} onChange={e => setAtaForm({...ataForm, horario: e.target.value})} placeholder="14h"/></Campo>
            <Campo label="Status"><select className="field" value={ataForm.status} onChange={e => setAtaForm({...ataForm, status: e.target.value})}><option value="rascunho">Rascunho</option><option value="aprovada">Aprovada</option><option value="arquivada">Arquivada</option></select></Campo>
            <Campo label="Título" className="md:col-span-2"><input className="field" value={ataForm.titulo || ''} onChange={e => setAtaForm({...ataForm, titulo: e.target.value})} required/></Campo>
            <Campo label="Local" className="md:col-span-2"><input className="field" value={ataForm.local || ''} onChange={e => setAtaForm({...ataForm, local: e.target.value})}/></Campo>
            <Campo label="Presidência"><input className="field" value={ataForm.presidencia || ''} onChange={e => setAtaForm({...ataForm, presidencia: e.target.value})}/></Campo>
            <Campo label="Secretaria"><input className="field" value={ataForm.secretaria || ''} onChange={e => setAtaForm({...ataForm, secretaria: e.target.value})}/></Campo>
            <Campo label="Pauta" className="md:col-span-2 xl:col-span-4"><textarea className="field" value={ataForm.pauta || ''} onChange={e => setAtaForm({...ataForm, pauta: e.target.value})} required/></Campo>
            <Campo label="Deliberações" className="md:col-span-2 xl:col-span-4"><textarea className="field" value={ataForm.deliberacoes || ''} onChange={e => setAtaForm({...ataForm, deliberacoes: e.target.value})}/></Campo>
            <Campo label="Presentes" className="md:col-span-2"><textarea className="field" value={ataForm.presentes || ''} onChange={e => setAtaForm({...ataForm, presentes: e.target.value})} placeholder="Um nome por linha"/></Campo>
            <Campo label="Observações" className="md:col-span-2"><textarea className="field" value={ataForm.observacoes || ''} onChange={e => setAtaForm({...ataForm, observacoes: e.target.value})}/></Campo>
          </div>
          <div className="mt-5 flex flex-wrap gap-3"><button className="btn-primary" disabled={loading}><Save size={18}/> Salvar ata</button><button type="button" className="btn-secondary" onClick={() => gerarAtaValidada(ataForm)}><FileDown size={18}/> Gerar ata validada</button><button type="button" className="btn-secondary" onClick={() => imprimirListaPresenca(ataForm, profile)}><Printer size={18}/> Lista de presença</button></div>
        </form>}
        {atasFiltradas.length === 0 ? <EmptyState>Nenhuma ata cadastrada.</EmptyState> : <TabelaAtas itens={atasFiltradas} podeEditar={podeEditar} editar={a => setAtaForm({...ataInicial, ...a})} excluir={id => excluir('atas', id)} imprimir={gerarAtaValidada} lista={a => imprimirListaPresenca(a, profile)}/>} 
      </>}

      {aba === 'protocolos' && <>
        {podeEditar && <form onSubmit={salvarProtocolo} className="card mb-7 p-5">
          <HeaderForm icon={<Send size={20}/>} title={protocoloForm.id ? 'Editar protocolo' : 'Novo protocolo'} onCancel={protocoloForm.id ? limparProtocolo : null}/>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Campo label="Número do protocolo"><input className="field" value={protocoloForm.numero_protocolo || ''} onChange={e => setProtocoloForm({...protocoloForm, numero_protocolo: e.target.value})}/></Campo>
            <Campo label="Órgão/instituição"><input className="field" value={protocoloForm.orgao || ''} onChange={e => setProtocoloForm({...protocoloForm, orgao: e.target.value})} required/></Campo>
            <Campo label="Assunto" className="md:col-span-2"><input className="field" value={protocoloForm.assunto || ''} onChange={e => setProtocoloForm({...protocoloForm, assunto: e.target.value})} required/></Campo>
            <Campo label="Data de envio"><input type="date" className="field" value={protocoloForm.data_envio || ''} onChange={e => setProtocoloForm({...protocoloForm, data_envio: e.target.value})}/></Campo>
            <Campo label="Prazo de resposta"><input type="date" className="field" value={protocoloForm.prazo_resposta || ''} onChange={e => setProtocoloForm({...protocoloForm, prazo_resposta: e.target.value})}/></Campo>
            <Campo label="Responsável"><input className="field" value={protocoloForm.responsavel || ''} onChange={e => setProtocoloForm({...protocoloForm, responsavel: e.target.value})}/></Campo>
            <Campo label="Status"><select className="field" value={protocoloForm.status} onChange={e => setProtocoloForm({...protocoloForm, status: e.target.value})}><option value="em_andamento">Em andamento</option><option value="respondido">Respondido</option><option value="pendente">Pendente</option><option value="atrasado">Atrasado</option><option value="encerrado">Encerrado</option></select></Campo>
            <Campo label="Anexo" className="md:col-span-2"><input type="file" accept="application/pdf,image/*,.doc,.docx,.xls,.xlsx" className="field" onChange={e => setArquivoProtocolo(e.target.files?.[0] || null)}/>{arquivoProtocolo && <p className="mt-1 text-xs font-bold text-floresta">Selecionado: {arquivoProtocolo.name}</p>}</Campo>
            <div className="flex items-end"><button type="button" className="btn-secondary w-full" disabled={!protocoloForm.arquivo_path} onClick={() => abrirArquivoPrivado(protocoloForm.arquivo_path)}><Upload size={16}/> Abrir anexo</button></div>
            <Campo label="Observações" className="md:col-span-2 xl:col-span-4"><textarea className="field" value={protocoloForm.observacoes || ''} onChange={e => setProtocoloForm({...protocoloForm, observacoes: e.target.value})}/></Campo>
          </div>
          <div className="mt-5 flex flex-wrap gap-3"><button className="btn-primary" disabled={loading}><Save size={18}/> Salvar protocolo</button><button type="button" className="btn-secondary" onClick={() => imprimirRelatorioProtocolos(protocolosFiltrados, profile)}><FileDown size={18}/> Relatório PDF</button></div>
        </form>}
        {protocolosFiltrados.length === 0 ? <EmptyState>Nenhum protocolo cadastrado.</EmptyState> : <TabelaProtocolos itens={protocolosFiltrados} podeEditar={podeEditar} editar={p => setProtocoloForm({...protocoloInicial, ...p})} excluir={id => excluir('protocolos', id)}/>} 
      </>}

      {aba === 'biblioteca' && <>
        {podeEditar && <form onSubmit={salvarDocumento} className="card mb-7 p-5">
          <HeaderForm icon={<FolderArchive size={20}/>} title={documentoForm.id ? 'Editar documento' : 'Novo documento na biblioteca'} onCancel={documentoForm.id ? limparDocumento : null}/>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Campo label="Título" className="md:col-span-2"><input className="field" value={documentoForm.titulo || ''} onChange={e => setDocumentoForm({...documentoForm, titulo: e.target.value})} required/></Campo>
            <Campo label="Categoria"><select className="field" value={documentoForm.categoria} onChange={e => setDocumentoForm({...documentoForm, categoria: e.target.value})}><option>Institucional</option><option>Cartório</option><option>Receita Federal</option><option>Financeiro</option><option>RGA</option><option>Conselho Fiscal</option><option>Ofícios</option><option>Contratos</option><option>Outros</option></select></Campo>
            <Campo label="Visibilidade"><select className="field" value={documentoForm.visibilidade} onChange={e => setDocumentoForm({...documentoForm, visibilidade: e.target.value})}><option value="diretoria">Diretoria</option><option value="conselho_fiscal">Conselho Fiscal</option><option value="todos">Todos</option></select></Campo>
            <Campo label="Tipo"><input className="field" value={documentoForm.tipo || ''} onChange={e => setDocumentoForm({...documentoForm, tipo: e.target.value})}/></Campo>
            <Campo label="Data"><input type="date" className="field" value={documentoForm.data_documento || ''} onChange={e => setDocumentoForm({...documentoForm, data_documento: e.target.value})}/></Campo>
            <Campo label="URL externa" className="md:col-span-2"><input className="field" value={documentoForm.url_arquivo || ''} onChange={e => setDocumentoForm({...documentoForm, url_arquivo: e.target.value})} placeholder="https://..."/></Campo>
            <Campo label="Arquivo interno" className="md:col-span-2"><input type="file" accept="application/pdf,image/*,.doc,.docx,.xls,.xlsx" className="field" onChange={e => setArquivoDocumento(e.target.files?.[0] || null)}/>{arquivoDocumento && <p className="mt-1 text-xs font-bold text-floresta">Selecionado: {arquivoDocumento.name}</p>}</Campo>
            <div className="flex items-end"><button type="button" className="btn-secondary w-full" disabled={!documentoForm.arquivo_path && !documentoForm.url_arquivo} onClick={() => documentoForm.arquivo_path ? abrirArquivoPrivado(documentoForm.arquivo_path) : window.open(documentoForm.url_arquivo, '_blank')}><Upload size={16}/> Abrir</button></div>
            <Campo label="Descrição" className="md:col-span-2 xl:col-span-4"><textarea className="field" value={documentoForm.descricao || ''} onChange={e => setDocumentoForm({...documentoForm, descricao: e.target.value})}/></Campo>
          </div>
          <div className="mt-5 flex flex-wrap gap-3"><button className="btn-primary" disabled={loading}><Save size={18}/> Salvar documento</button></div>
        </form>}
        {documentosFiltrados.length === 0 ? <EmptyState>Nenhum documento cadastrado na biblioteca.</EmptyState> : <TabelaDocumentos itens={documentosFiltrados} podeEditar={podeEditar} editar={d => setDocumentoForm({...documentoInicial, ...d})} excluir={id => excluir('biblioteca_documentos', id)}/>} 
      </>}
    </PageShell>
  );
}

function HeaderForm({ icon, title, onCancel }) {
  return <div className="mb-5 flex items-center justify-between gap-3"><h2 className="flex items-center gap-2 text-xl font-black text-floresta">{icon} {title}</h2>{onCancel && <button type="button" className="btn-secondary" onClick={onCancel}><X size={16}/> Cancelar</button>}</div>;
}

function Campo({ label, className = '', children }) {
  return <div className={className}><label className="label">{label}</label>{children}</div>;
}

function TabelaAtas({ itens, podeEditar, editar, excluir, imprimir, lista }) {
  return <div className="table-wrap"><table className="table"><thead><tr><th>Data</th><th>Ata</th><th>Status</th><th>Cadastrado por</th><th>Ações</th></tr></thead><tbody>{itens.map(a => <tr key={a.id}><td>{dateBR(a.data_reuniao)}<br/><span className="text-xs text-slate-500">{a.horario || ''}</span></td><td><strong className="text-floresta">{a.titulo}</strong><br/><span className="text-xs text-slate-500">{a.tipo} • {a.local}</span></td><td><span className="badge bg-creme text-floresta">{badgeStatus(a.status)}</span></td><td>{a.cadastrado_por_nome || '-'}</td><td><div className="flex flex-wrap gap-2">{podeEditar && <button className="rounded-xl bg-creme p-2 text-floresta" onClick={() => editar(a)}><FileText size={16}/></button>}<button className="rounded-xl bg-green-50 p-2 text-green-700" onClick={() => imprimir(a)}><FileDown size={16}/></button><button className="rounded-xl bg-blue-50 p-2 text-azul" onClick={() => lista(a)}><Printer size={16}/></button>{podeEditar && <button className="rounded-xl bg-red-50 p-2 text-red-700" onClick={() => excluir(a.id)}><Trash2 size={16}/></button>}</div></td></tr>)}</tbody></table></div>;
}

function TabelaProtocolos({ itens, podeEditar, editar, excluir }) {
  return <div className="table-wrap"><table className="table"><thead><tr><th>Envio</th><th>Órgão</th><th>Protocolo</th><th>Assunto</th><th>Status</th><th>Anexo</th><th>Ações</th></tr></thead><tbody>{itens.map(p => <tr key={p.id}><td>{dateBR(p.data_envio)}<br/><span className="text-xs text-slate-500">Prazo: {dateBR(p.prazo_resposta)}</span></td><td>{p.orgao}</td><td>{p.numero_protocolo || '-'}</td><td><strong className="text-floresta">{p.assunto}</strong><br/><span className="text-xs text-slate-500">Resp.: {p.responsavel || '-'}</span></td><td><span className="badge bg-creme text-floresta">{badgeStatus(p.status)}</span></td><td>{p.arquivo_path ? <button className="btn-secondary" onClick={() => abrirArquivoPrivado(p.arquivo_path)}><Upload size={16}/> Abrir</button> : <span className="text-slate-400">Sem anexo</span>}</td><td><div className="flex flex-wrap gap-2">{podeEditar && <button className="rounded-xl bg-creme p-2 text-floresta" onClick={() => editar(p)}><FileText size={16}/></button>}{podeEditar && <button className="rounded-xl bg-red-50 p-2 text-red-700" onClick={() => excluir(p.id)}><Trash2 size={16}/></button>}</div></td></tr>)}</tbody></table></div>;
}

function TabelaDocumentos({ itens, podeEditar, editar, excluir }) {
  return <div className="table-wrap"><table className="table"><thead><tr><th>Data</th><th>Documento</th><th>Categoria</th><th>Visibilidade</th><th>Cadastrado por</th><th>Ações</th></tr></thead><tbody>{itens.map(d => <tr key={d.id}><td>{dateBR(d.data_documento)}</td><td><strong className="text-floresta">{d.titulo}</strong><br/><span className="text-xs text-slate-500">{d.descricao || '-'}</span></td><td>{d.categoria}<br/><span className="text-xs text-slate-500">{d.tipo || '-'}</span></td><td><span className="badge bg-creme text-floresta">{badgeStatus(d.visibilidade)}</span></td><td>{d.cadastrado_por_nome || '-'}</td><td><div className="flex flex-wrap gap-2">{(d.arquivo_path || d.url_arquivo) && <button className="rounded-xl bg-green-50 p-2 text-green-700" onClick={() => d.arquivo_path ? abrirArquivoPrivado(d.arquivo_path) : window.open(d.url_arquivo, '_blank')}><Upload size={16}/></button>}{podeEditar && <button className="rounded-xl bg-creme p-2 text-floresta" onClick={() => editar(d)}><FileText size={16}/></button>}{podeEditar && <button className="rounded-xl bg-red-50 p-2 text-red-700" onClick={() => excluir(d.id)}><Trash2 size={16}/></button>}</div></td></tr>)}</tbody></table></div>;
}
