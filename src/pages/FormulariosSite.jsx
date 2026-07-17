import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Inbox, Mail, RefreshCcw, Search, UserPlus } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { dateTimeBR } from '../lib/format';
import PageShell from '../components/PageShell';
import EmptyState from '../components/EmptyState';

const STATUS = {
  novo: 'Novo',
  em_analise: 'Em análise',
  respondido: 'Respondido',
  arquivado: 'Arquivado'
};

const ORIGEM = {
  associado: 'Solicitação de associado',
  contato: 'Mensagem de contato'
};

function badgeStatus(status) {
  if (status === 'novo') return 'bg-amber-50 text-amber-800';
  if (status === 'em_analise') return 'bg-blue-50 text-blue-800';
  if (status === 'respondido') return 'bg-emerald-50 text-emerald-800';
  return 'bg-slate-100 text-slate-700';
}

function texto(valor) {
  return valor || '-';
}

export default function FormulariosSite({ profile }) {
  const [lista, setLista] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filtroOrigem, setFiltroOrigem] = useState('todos');
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [busca, setBusca] = useState('');
  const [selecionado, setSelecionado] = useState(null);

  useEffect(() => { carregar(); }, []);

  async function carregar() {
    setLoading(true);
    const { data, error } = await supabase
      .from('site_formularios')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      alert('Erro ao carregar formulários do site: ' + error.message + '\nVerifique se o SQL atualizacao-v6-5-site-integrado.sql foi executado no Supabase.');
    }

    setLista(data || []);
    setLoading(false);
  }

  async function atualizarRegistro(id, campos) {
    const payload = {
      ...campos,
      atendido_por_nome: profile?.nome || profile?.email || null,
      atendido_por_email: profile?.email || null,
      updated_at: new Date().toISOString()
    };

    const { error } = await supabase
      .from('site_formularios')
      .update(payload)
      .eq('id', id);

    if (error) {
      alert('Erro ao atualizar: ' + error.message);
      return;
    }

    await carregar();
    setSelecionado(prev => prev?.id === id ? { ...prev, ...payload } : prev);
  }

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return lista.filter(item => {
      const origemOk = filtroOrigem === 'todos' || item.origem === filtroOrigem;
      const statusOk = filtroStatus === 'todos' || item.status === filtroStatus;
      const textoBusca = [item.nome_completo, item.email, item.telefone, item.cpf, item.assunto, item.mensagem, item.tipo_cadastro]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      const buscaOk = !termo || textoBusca.includes(termo);
      return origemOk && statusOk && buscaOk;
    });
  }, [lista, filtroOrigem, filtroStatus, busca]);

  const totalNovos = lista.filter(item => item.status === 'novo').length;
  const totalAssociados = lista.filter(item => item.origem === 'associado').length;
  const totalContatos = lista.filter(item => item.origem === 'contato').length;

  return (
    <PageShell
      eyebrow="Site público"
      title="Formulários do Site"
      description="Acompanhe as solicitações de admissão e mensagens enviadas pelo site público da AAC. As respostas chegam aqui automaticamente pelo Supabase."
      action={<button className="btn-secondary" onClick={carregar}><RefreshCcw size={17} /> {loading ? 'Atualizando...' : 'Atualizar'}</button>}
    >
      <div className="mb-7 grid gap-4 md:grid-cols-3">
        <div className="card p-5"><p className="text-sm font-bold text-slate-500">Novos</p><p className="mt-1 text-3xl font-black text-floresta">{totalNovos}</p></div>
        <div className="card p-5"><p className="text-sm font-bold text-slate-500">Solicitações de associado</p><p className="mt-1 text-3xl font-black text-floresta">{totalAssociados}</p></div>
        <div className="card p-5"><p className="text-sm font-bold text-slate-500">Mensagens de contato</p><p className="mt-1 text-3xl font-black text-floresta">{totalContatos}</p></div>
      </div>

      <div className="card mb-7 p-5">
        <div className="grid gap-4 md:grid-cols-4">
          <div>
            <label className="label">Tipo</label>
            <select className="field" value={filtroOrigem} onChange={e => setFiltroOrigem(e.target.value)}>
              <option value="todos">Todos</option>
              <option value="associado">Solicitação de associado</option>
              <option value="contato">Mensagem de contato</option>
            </select>
          </div>
          <div>
            <label className="label">Status</label>
            <select className="field" value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}>
              <option value="todos">Todos</option>
              {Object.entries(STATUS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="label">Buscar</label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-3 text-slate-400" size={18} />
              <input className="field pl-10" value={busca} onChange={e => setBusca(e.target.value)} placeholder="Nome, CPF, e-mail, telefone, assunto..." />
            </div>
          </div>
        </div>
      </div>

      {filtrados.length === 0 ? (
        <EmptyState title="Nenhuma resposta encontrada">Quando alguém preencher os formulários do site, os dados aparecerão nesta tela.</EmptyState>
      ) : (
        <div className="grid gap-5 xl:grid-cols-2">
          {filtrados.map(item => (
            <article key={item.id} className="card p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="badge bg-creme text-floresta">{ORIGEM[item.origem] || item.origem}</span>
                    <span className={`badge ${badgeStatus(item.status)}`}>{STATUS[item.status] || item.status}</span>
                  </div>
                  <h3 className="mt-3 text-xl font-black text-floresta">{texto(item.nome_completo)}</h3>
                  <p className="text-sm text-slate-500">Recebido em {dateTimeBR(item.created_at)}</p>
                </div>
                <button className="btn-secondary" onClick={() => setSelecionado(item)}>{item.origem === 'associado' ? <UserPlus size={16}/> : <Mail size={16}/>} Ver detalhes</button>
              </div>

              <div className="mt-4 grid gap-3 text-sm md:grid-cols-2">
                <p><strong>E-mail:</strong> {texto(item.email)}</p>
                <p><strong>Telefone:</strong> {texto(item.telefone)}</p>
                {item.origem === 'associado' && <p><strong>CPF:</strong> {texto(item.cpf)}</p>}
                {item.origem === 'associado' && <p><strong>Tipo:</strong> {texto(item.tipo_cadastro)}</p>}
                {item.origem === 'contato' && <p><strong>Assunto:</strong> {texto(item.assunto)}</p>}
                <p><strong>Status:</strong> {STATUS[item.status] || item.status}</p>
              </div>

              <p className="mt-4 line-clamp-3 text-slate-700">{texto(item.mensagem)}</p>
            </article>
          ))}
        </div>
      )}

      {selecionado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-3xl bg-white p-6 shadow-premium">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.2em] text-terra">Detalhes</p>
                <h2 className="text-2xl font-black text-floresta">{ORIGEM[selecionado.origem]}</h2>
                <p className="text-slate-500">Recebido em {dateTimeBR(selecionado.created_at)}</p>
              </div>
              <button className="btn-secondary" onClick={() => setSelecionado(null)}>Fechar</button>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl bg-creme p-4"><strong>Nome</strong><p>{texto(selecionado.nome_completo)}</p></div>
              <div className="rounded-2xl bg-creme p-4"><strong>E-mail</strong><p>{texto(selecionado.email)}</p></div>
              <div className="rounded-2xl bg-creme p-4"><strong>Telefone</strong><p>{texto(selecionado.telefone)}</p></div>
              <div className="rounded-2xl bg-creme p-4"><strong>Status</strong><p>{STATUS[selecionado.status] || selecionado.status}</p></div>
              {selecionado.origem === 'associado' && <div className="rounded-2xl bg-creme p-4"><strong>CPF</strong><p>{texto(selecionado.cpf)}</p></div>}
              {selecionado.origem === 'associado' && <div className="rounded-2xl bg-creme p-4"><strong>Endereço</strong><p>{texto(selecionado.endereco_residencial)}</p></div>}
              {selecionado.origem === 'associado' && <div className="rounded-2xl bg-creme p-4"><strong>Tipo de cadastro</strong><p>{texto(selecionado.tipo_cadastro)}</p></div>}
              {selecionado.origem === 'associado' && <div className="rounded-2xl bg-creme p-4"><strong>Possui cavalos</strong><p>{texto(selecionado.possui_cavalos)}</p></div>}
              {selecionado.origem === 'contato' && <div className="rounded-2xl bg-creme p-4 md:col-span-2"><strong>Assunto</strong><p>{texto(selecionado.assunto)}</p></div>}
              <div className="rounded-2xl bg-creme p-4 md:col-span-2"><strong>Mensagem</strong><p className="whitespace-pre-wrap">{texto(selecionado.mensagem)}</p></div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div>
                <label className="label">Status de atendimento</label>
                <select className="field" value={selecionado.status} onChange={e => setSelecionado({...selecionado, status: e.target.value})}>
                  {Object.entries(STATUS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Observações internas</label>
                <textarea className="field" value={selecionado.observacoes_internas || ''} onChange={e => setSelecionado({...selecionado, observacoes_internas: e.target.value})}></textarea>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <button className="btn-primary" onClick={() => atualizarRegistro(selecionado.id, { status: selecionado.status, observacoes_internas: selecionado.observacoes_internas || null })}><CheckCircle2 size={18}/> Salvar atendimento</button>
              <button className="btn-secondary" onClick={() => atualizarRegistro(selecionado.id, { status: 'arquivado' })}><Inbox size={18}/> Arquivar</button>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}
