import { useEffect, useMemo, useState } from 'react';
import { BadgeCheck, CreditCard, Edit3, FileDown, FileSignature, FileText, Plus, Save, Search, Trash2, Upload, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { cpfMask, dateBR, phoneMask } from '../lib/format';
import { canEdit } from '../lib/permissions';
import { uploadArquivo, abrirArquivoPrivado } from '../lib/storage';
import { htmlFichaAssociadoAssinavel, imprimirCarteirinhaAssociado, imprimirCertidaoAssociado, imprimirFichaAssociado } from '../lib/printDocs';
import { registrarValidacaoDocumento } from '../lib/validacao';
import { abrirDocumentoFinalPorId } from '../lib/documentoFinal';
import PageShell from '../components/PageShell';
import EmptyState from '../components/EmptyState';

const inicial = {
  id: null,
  matricula: '',
  numero_ficha: '',
  data_admissao: new Date().toISOString().slice(0, 10),
  nome_completo: '',
  data_nascimento: '',
  estado_civil: '',
  nacionalidade: 'Brasileira',
  profissao: '',
  rg: '',
  orgao_emissor_uf: '',
  cpf: '',
  telefone_whatsapp: '',
  email: '',
  sem_email: false,
  autoriza_whatsapp_oficial: true,
  isencao_mensalidade: 'sem_isencao',
  isencao_ate: '',
  motivo_isencao: '',
  rua_logradouro: '',
  numero: '',
  complemento: '',
  bairro: '',
  cidade: 'São Francisco do Sul',
  uf: 'SC',
  cep: '',
  endereco_residencial: '',
  tipo_cadastro: 'Condutor/Carroceiro',
  possui_cavalos: 'Sim',
  atividade_proprietario: false,
  atividade_frete: false,
  atividade_apoiador: false,
  status: 'pendente',
  observacoes: '',
  aceite_normas: false,
  ficha_pdf_path: '',
  ficha_pdf_url: '',
  ficha_assinada_documento_id: '',
  ficha_assinada_em: '',
  cadastrado_por_nome: '',
  cadastrado_por_email: '',
  atualizado_por_nome: '',
  atualizado_por_email: ''
};

function normalizar(item = {}) {
  return { ...inicial, ...item, data_admissao: item.data_admissao || inicial.data_admissao };
}

function enderecoCompleto(form) {
  return [form.rua_logradouro, form.numero, form.complemento, form.bairro, form.cidade, form.uf, form.cep].filter(Boolean).join(', ');
}

function limparPayloadAssociado(payload) {
  const limpo = { ...payload };
  const camposData = ['data_nascimento', 'isencao_ate', 'ficha_assinada_em'];
  const camposUuid = ['ficha_assinada_documento_id'];

  for (const campo of camposData) {
    if (limpo[campo] === '') limpo[campo] = null;
  }

  for (const campo of camposUuid) {
    if (limpo[campo] === '') limpo[campo] = null;
  }

  return limpo;
}

async function sha256(texto = '') {
  const bytes = new TextEncoder().encode(texto);
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}


async function consultarOpcional(query) {
  try {
    const resultado = await query;
    return resultado || { data: [], error: null };
  } catch (error) {
    return { data: [], error: null };
  }
}

export default function Associados({ profile }) {
  const [lista, setLista] = useState([]);
  const [form, setForm] = useState(inicial);
  const [arquivoFicha, setArquivoFicha] = useState(null);
  const [busca, setBusca] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const podeEditar = canEdit(profile, 'associados');
  const editando = Boolean(form.id);

  useEffect(() => { carregar(); }, []);

  async function carregar() {
    setLoading(true);
    const { data, error } = await supabase.from('associados').select('*').order('created_at', { ascending: false });
    if (!error) setLista(data || []);
    setLoading(false);
  }

  function limparForm() {
    setForm(inicial);
    setArquivoFicha(null);
    setMsg('');
  }

  function editar(item) {
    setForm(normalizar(item));
    setArquivoFicha(null);
    setMsg('Editando associado. Faça as alterações e clique em Salvar alterações.');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function salvar(e) {
    e.preventDefault();
    if (!podeEditar) return;
    setLoading(true);
    setMsg('');

    let ficha_pdf_path = form.ficha_pdf_path || '';
    if (arquivoFicha) {
      const { path, error } = await uploadArquivo(arquivoFicha, 'associados/fichas');
      if (error) {
        alert('Erro ao enviar PDF: ' + error.message);
        setLoading(false);
        return;
      }
      ficha_pdf_path = path;
    }

    const payload = limparPayloadAssociado({
      ...form,
      email: form.sem_email ? null : form.email,
      endereco_residencial: form.endereco_residencial || enderecoCompleto(form),
      ficha_pdf_path,
      atualizado_por_nome: profile?.nome || profile?.email || '',
      atualizado_por_email: profile?.email || '',
      updated_at: new Date().toISOString()
    });
    if (!editando) {
      payload.cadastrado_por_nome = profile?.nome || profile?.email || '';
      payload.cadastrado_por_email = profile?.email || '';
    }
    delete payload.id;
    delete payload.created_at;

    const query = editando
      ? supabase.from('associados').update(payload).eq('id', form.id)
      : supabase.from('associados').insert(payload);

    const { error } = await query;
    if (error) {
      alert('Erro ao salvar: ' + error.message);
    } else {
      setMsg(editando ? 'Associado atualizado com sucesso.' : 'Associado cadastrado com sucesso.');
      limparForm();
      await carregar();
    }
    setLoading(false);
  }

  async function excluir(id) {
    if (!podeEditar) return;
    if (!confirm('Tem certeza que deseja excluir este associado?')) return;
    const { error } = await supabase.from('associados').delete().eq('id', id);
    if (error) alert('Erro ao excluir: ' + error.message);
    await carregar();
  }

  async function gerarCertidaoAssociado(associado, tipo = 'inteiro_teor') {
    setLoading(true);
    try {
      const [animaisResp, mensalidadesResp] = await Promise.all([
        supabase.from('animais').select('*, associados(*)').eq('associado_id', associado.id).order('created_at', { ascending: false }),
        consultarOpcional(
          supabase.from('mensalidades').select('*').eq('associado_id', associado.id).order('competencia', { ascending: false }).limit(36)
        )
      ]);
      const { data: animaisData, error: animaisError } = animaisResp;
      const { data: mensalidadesData, error: mensalidadesError } = mensalidadesResp;
      if (animaisError) throw animaisError;
      if (mensalidadesError) throw mensalidadesError;
      const validacao = await registrarValidacaoDocumento({
        tipo_documento: tipo === 'regularidade' ? 'Certidão de Regularidade Associativa' : tipo === 'simples' ? 'Certidão Cadastral Simples do Associado' : 'Certidão Cadastral de Inteiro Teor do Associado',
        titulo: `Certidão do associado ${associado.nome_completo || associado.matricula || ''}`,
        codigo_referencia: associado.matricula || associado.numero_ficha || associado.id,
        associado_id: associado.id,
        emitido_por_nome: profile?.nome || profile?.email || '',
        emitido_por_email: profile?.email || '',
        dados_publicos: {
          nome: associado.nome_completo || '',
          matricula: associado.matricula || associado.numero_ficha || '',
          status: associado.status || '',
          tipo
        }
      });
      imprimirCertidaoAssociado(associado, animaisData || [], mensalidadesData || [], profile, tipo, validacao.data);
    } catch (error) {
      alert('Erro ao gerar certidão do associado: ' + (error?.message || error));
    } finally {
      setLoading(false);
    }
  }

  async function enviarFichaParaAssinatura(associado) {
    if (!podeEditar) return;
    setLoading(true);
    try {
      const conteudo = htmlFichaAssociadoAssinavel(
        { ...associado, endereco_residencial: associado.endereco_residencial || enderecoCompleto(associado) },
        profile
      );
      const hash = await sha256(`${associado.id}|${conteudo}`);
      const { data: doc, error } = await supabase.from('documentos_processos').insert({
        modelo_slug: 'ficha_associado',
        tipo_documento: 'Ficha de Inscricao',
        titulo: `Ficha de inscricao - ${associado.nome_completo || 'Associado AAC'}`,
        data_documento: new Date().toISOString().slice(0, 10),
        status: 'em_assinatura',
        interessado: associado.nome_completo || '',
        interessado_associado_id: associado.id,
        origem_sistema: 'associado_ficha',
        origem_id: associado.id,
        conteudo_html: conteudo,
        documento_original_html: conteudo,
        documento_original_hash: hash,
        texto_pesquisa: associado.nome_completo || '',
        hash_documento: hash,
        cadastrado_por_nome: profile?.nome || profile?.email || '',
        cadastrado_por_email: profile?.email || '',
        atualizado_por_nome: profile?.nome || profile?.email || '',
        atualizado_por_email: profile?.email || ''
      }).select('*').single();
      if (error) throw error;
      const { error: assinanteError } = await supabase.from('documento_assinantes').insert({
        documento_id: doc.id,
        associado_id: associado.id,
        nome: associado.nome_completo || '',
        cpf: associado.cpf || '',
        telefone_whatsapp: associado.telefone_whatsapp || '',
        email: associado.email || '',
        cargo: 'Associado proponente',
        tipo_assinatura: 'assinatura',
        obrigatorio: true,
        ordem: 1,
        token_acesso: crypto.randomUUID(),
        status: 'pendente'
      });
      if (assinanteError) throw assinanteError;
      alert('Ficha enviada para Documentos e Processos como documento assinável.');
    } catch (error) {
      alert('Erro ao criar ficha assinável: ' + (error?.message || error));
    } finally {
      setLoading(false);
    }
  }

  async function abrirFichaAssinada(associado) {
    if (!associado?.ficha_assinada_documento_id) {
      imprimirFichaAssociado(associado, profile);
      return;
    }
    setLoading(true);
    const { error } = await abrirDocumentoFinalPorId(supabase, associado.ficha_assinada_documento_id);
    if (error) alert('Erro ao abrir ficha assinada:\n' + (error.message || error));
    setLoading(false);
  }

  const filtrada = useMemo(() => {
    const q = busca.toLowerCase().trim();
    if (!q) return lista;
    return lista.filter((item) => [
      item.nome_completo, item.cpf, item.telefone_whatsapp, item.email, item.matricula, item.numero_ficha, item.status
    ].join(' ').toLowerCase().includes(q));
  }, [lista, busca]);

  return (
    <PageShell
      eyebrow="Secretaria"
      title="Associados"
      description="Cadastre, edite, anexe a ficha assinada em PDF, gere a ficha de inscrição e imprima carteirinhas institucionais."
      action={<button className="btn-secondary" onClick={carregar}>{loading ? 'Carregando...' : 'Atualizar'}</button>}
    >
      {podeEditar && (
        <form onSubmit={salvar} className="card mb-7 p-5">
          <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-2 text-floresta">
              {editando ? <Edit3 size={20} /> : <Plus size={20} />}
              <h2 className="text-xl font-black">{editando ? 'Editar associado' : 'Novo associado'}</h2>
            </div>
            {editando && <button type="button" className="btn-secondary" onClick={limparForm}><X size={16} /> Cancelar edição</button>}
          </div>

          {msg && <div className="mb-5 rounded-2xl border border-green-100 bg-green-50 p-4 text-sm font-bold text-green-700">{msg}</div>}

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div><label className="label">Matrícula</label><input className="field" value={form.matricula || ''} onChange={e => setForm({...form, matricula: e.target.value})} placeholder="Gerada automaticamente" /><p className="mt-1 text-xs font-semibold text-slate-500">Deixe em branco para gerar ao salvar.</p></div>
            <div><label className="label">Nº da ficha</label><input className="field" value={form.numero_ficha || ''} onChange={e => setForm({...form, numero_ficha: e.target.value})} placeholder="Gerado automaticamente" /><p className="mt-1 text-xs font-semibold text-slate-500">Deixe em branco para gerar ao salvar.</p></div>
            <div><label className="label">Data de admissão</label><input type="date" className="field" value={form.data_admissao || ''} onChange={e => setForm({...form, data_admissao: e.target.value})} /></div>
            <div><label className="label">Status</label><select className="field" value={form.status} onChange={e => setForm({...form, status: e.target.value})}><option value="pendente">Pendente</option><option value="aprovado">Aprovado</option><option value="reprovado">Reprovado</option><option value="inativo">Inativo</option></select></div>

            <div className="md:col-span-2"><label className="label">Nome completo</label><input className="field" value={form.nome_completo} onChange={e => setForm({...form, nome_completo: e.target.value})} required /></div>
            <div><label className="label">CPF</label><input className="field" value={form.cpf || ''} onChange={e => setForm({...form, cpf: cpfMask(e.target.value)})} placeholder="000.000.000-00" required /></div>
            <div><label className="label">RG / Órgão emissor</label><input className="field" value={form.rg || ''} onChange={e => setForm({...form, rg: e.target.value})} placeholder="RG" /></div>
            <div><label className="label">Órgão Emissor/UF</label><input className="field" value={form.orgao_emissor_uf || ''} onChange={e => setForm({...form, orgao_emissor_uf: e.target.value})} placeholder="SSP/SC" /></div>
            <div><label className="label">Data de nascimento</label><input type="date" className="field" value={form.data_nascimento || ''} onChange={e => setForm({...form, data_nascimento: e.target.value})} /></div>
            <div><label className="label">Estado civil</label><input className="field" value={form.estado_civil || ''} onChange={e => setForm({...form, estado_civil: e.target.value})} /></div>
            <div><label className="label">Nacionalidade</label><input className="field" value={form.nacionalidade || ''} onChange={e => setForm({...form, nacionalidade: e.target.value})} /></div>
            <div><label className="label">Profissão</label><input className="field" value={form.profissao || ''} onChange={e => setForm({...form, profissao: e.target.value})} /></div>
            <div><label className="label">WhatsApp / Telefone</label><input className="field" value={form.telefone_whatsapp || ''} onChange={e => setForm({...form, telefone_whatsapp: phoneMask(e.target.value)})} /></div>
            <div>
              <label className="label">E-mail</label>
              <input type="email" className="field" value={form.sem_email ? '' : (form.email || '')} disabled={!!form.sem_email} onChange={e => setForm({...form, email: e.target.value})} placeholder="email@exemplo.com" />
              <label className="mt-2 flex items-center gap-2 text-xs font-bold text-slate-600"><input type="checkbox" checked={!!form.sem_email} onChange={e => setForm({...form, sem_email: e.target.checked, email: e.target.checked ? '' : form.email})} /> Associado nao possui e-mail</label>
            </div>

            <div className="md:col-span-2"><label className="label">Rua / Logradouro</label><input className="field" value={form.rua_logradouro || ''} onChange={e => setForm({...form, rua_logradouro: e.target.value})} /></div>
            <div><label className="label">Número</label><input className="field" value={form.numero || ''} onChange={e => setForm({...form, numero: e.target.value})} /></div>
            <div><label className="label">Complemento</label><input className="field" value={form.complemento || ''} onChange={e => setForm({...form, complemento: e.target.value})} /></div>
            <div><label className="label">Bairro</label><input className="field" value={form.bairro || ''} onChange={e => setForm({...form, bairro: e.target.value})} /></div>
            <div><label className="label">Cidade</label><input className="field" value={form.cidade || ''} onChange={e => setForm({...form, cidade: e.target.value})} /></div>
            <div><label className="label">UF</label><input className="field" value={form.uf || ''} onChange={e => setForm({...form, uf: e.target.value})} /></div>
            <div><label className="label">CEP</label><input className="field" value={form.cep || ''} onChange={e => setForm({...form, cep: e.target.value})} /></div>

            <div><label className="label">Tipo</label><select className="field" value={form.tipo_cadastro} onChange={e => setForm({...form, tipo_cadastro: e.target.value})}><option>Condutor/Carroceiro</option><option>Membro Apoiador</option><option>Prestador de Frete</option></select></div>
            <div><label className="label">Possui cavalos?</label><select className="field" value={form.possui_cavalos || 'Não'} onChange={e => setForm({...form, possui_cavalos: e.target.value})}><option>Sim</option><option>Não</option></select></div>
            <div><label className="label">Isenção de mensalidade</label><select className="field" value={form.isencao_mensalidade || 'sem_isencao'} onChange={e => setForm({...form, isencao_mensalidade: e.target.value})}><option value="sem_isencao">Sem isenção</option><option value="primeiro_mes">Isento no primeiro mês</option><option value="ate_data">Isento até uma data</option><option value="permanente">Isento permanente</option></select></div>
            <div><label className="label">Isento até</label><input type="date" className="field" disabled={form.isencao_mensalidade !== 'ate_data'} value={form.isencao_ate || ''} onChange={e => setForm({...form, isencao_ate: e.target.value})} /></div>
            <div className="md:col-span-2"><label className="label">Motivo da isenção</label><input className="field" value={form.motivo_isencao || ''} onChange={e => setForm({...form, motivo_isencao: e.target.value})} placeholder="Ex.: decisão da diretoria, baixa renda, associado fundador..." /></div>
            <div className="md:col-span-2 xl:col-span-4 grid gap-3 rounded-2xl bg-creme p-4 md:grid-cols-3">
              <label className="flex items-center gap-2 font-bold text-slate-700"><input type="checkbox" checked={!!form.atividade_proprietario} onChange={e => setForm({...form, atividade_proprietario: e.target.checked})} /> Proprietário de Cavalo/Carroça</label>
              <label className="flex items-center gap-2 font-bold text-slate-700"><input type="checkbox" checked={!!form.atividade_frete} onChange={e => setForm({...form, atividade_frete: e.target.checked})} /> Prestador de Serviços de Frete</label>
              <label className="flex items-center gap-2 font-bold text-slate-700"><input type="checkbox" checked={!!form.atividade_apoiador} onChange={e => setForm({...form, atividade_apoiador: e.target.checked})} /> Sócio Apoiador/Voluntário</label>
            </div>
            <div className="md:col-span-2"><label className="label">Anexar ficha cadastral assinada em PDF</label><input type="file" accept="application/pdf" className="field" onChange={e => setArquivoFicha(e.target.files?.[0] || null)} /></div>
            <div className="flex items-end gap-2"><button type="button" className="btn-secondary w-full" disabled={!form.ficha_pdf_path && !form.ficha_pdf_url} onClick={() => abrirArquivoPrivado(form.ficha_pdf_path || form.ficha_pdf_url)}><Upload size={16}/> Abrir ficha anexada</button></div>
            {form.ficha_assinada_documento_id && <div className="md:col-span-2 xl:col-span-4 flex flex-col gap-3 rounded-2xl border border-green-100 bg-green-50 p-3 text-sm font-bold text-green-700 md:flex-row md:items-center md:justify-between"><span>Ficha assinada pela Mesa de Assinaturas e arquivada neste cadastro em {dateBR(form.ficha_assinada_em)}.</span><button type="button" className="btn-secondary bg-white" onClick={() => abrirFichaAssinada(form)}><FileDown size={16}/> Abrir ficha assinada</button></div>}
            <div className="flex items-end"><label className="flex items-center gap-2 rounded-2xl bg-white p-3 font-bold text-slate-700"><input type="checkbox" checked={!!form.aceite_normas} onChange={e => setForm({...form, aceite_normas: e.target.checked})} /> Ciente das normas financeiras</label></div>
            <div className="flex items-end"><label className="flex items-center gap-2 rounded-2xl bg-white p-3 font-bold text-slate-700"><input type="checkbox" checked={!!form.autoriza_whatsapp_oficial} onChange={e => setForm({...form, autoriza_whatsapp_oficial: e.target.checked})} /> Autoriza comunicados oficiais por WhatsApp</label></div>
            <div className="md:col-span-2 xl:col-span-4"><label className="label">Observações</label><textarea className="field" value={form.observacoes || ''} onChange={e => setForm({...form, observacoes: e.target.value})}></textarea></div>
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <button className="btn-primary" disabled={loading}><Save size={18} /> {editando ? 'Salvar alterações' : 'Salvar associado'}</button>
            <button type="button" className="btn-secondary" onClick={() => abrirFichaAssinada(form)}><FileDown size={18} /> {form.ficha_assinada_documento_id ? 'Gerar ficha assinada em PDF' : 'Gerar ficha em PDF'}</button>
            {editando && <button type="button" className="btn-secondary" onClick={() => imprimirCarteirinhaAssociado(form, profile)}><CreditCard size={18} /> Gerar carteirinha</button>}
            {editando && <button type="button" className="btn-secondary" onClick={() => gerarCertidaoAssociado(form, 'inteiro_teor')}><FileText size={18} /> Certidão inteiro teor</button>}
            {editando && <button type="button" className="btn-secondary" onClick={() => enviarFichaParaAssinatura(form)}><FileSignature size={18} /> Ficha assinável</button>}
          </div>
        </form>
      )}

      <div className="mb-5 flex items-center gap-3 rounded-3xl bg-white p-3 shadow-premium">
        <Search className="ml-2 text-floresta" size={20} />
        <input className="w-full bg-transparent px-2 py-2 outline-none" value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar por nome, CPF, matrícula, e-mail, telefone ou status..." />
      </div>

      {filtrada.length === 0 ? <EmptyState>Cadastre o primeiro associado ou ajuste a busca.</EmptyState> : (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Associado</th><th>Contato</th><th>Categoria</th><th>Status</th><th>Ficha</th><th>Ações</th></tr></thead>
            <tbody>
              {filtrada.map(item => (
                <tr key={item.id}>
                  <td><strong className="text-floresta">{item.nome_completo}</strong><br/><span className="text-xs text-slate-500">CPF: {item.cpf || '-'} • Matrícula: {item.matricula || item.numero_ficha || '-'}</span></td>
                  <td>{item.telefone_whatsapp || '-'}<br/><span className="text-xs text-slate-500">{item.email || item.endereco_residencial || '-'}</span></td>
                  <td>{item.tipo_cadastro}<br/><span className="text-xs text-slate-500">Cavalos: {item.possui_cavalos || '-'}</span></td>
                  <td><span className="badge bg-creme text-floresta">{item.status}</span>{item.aceite_normas && <span className="ml-2 inline-flex text-green-700"><BadgeCheck size={15}/></span>}</td>
                  <td>{item.ficha_assinada_documento_id ? <button className="btn-secondary" onClick={() => abrirFichaAssinada(item)}><FileText size={16}/> Assinada</button> : item.ficha_pdf_path || item.ficha_pdf_url ? <button className="btn-secondary" onClick={() => abrirArquivoPrivado(item.ficha_pdf_path || item.ficha_pdf_url)}><FileText size={16}/> Abrir</button> : <span className="text-slate-400">Sem anexo</span>}</td>
                  <td><div className="flex flex-wrap gap-2">{podeEditar && <button className="rounded-xl bg-creme p-2 text-floresta" onClick={() => editar(item)} title="Editar"><Edit3 size={16}/></button>}<button className="rounded-xl bg-green-50 p-2 text-green-700" onClick={() => abrirFichaAssinada(item)} title={item.ficha_assinada_documento_id ? 'Ficha assinada' : 'Ficha'}><FileDown size={16}/></button><button className="rounded-xl bg-blue-50 p-2 text-azul" onClick={() => imprimirCarteirinhaAssociado(item, profile)} title="Carteirinha"><CreditCard size={16}/></button><button className="rounded-xl bg-amber-50 p-2 text-amber-700" onClick={() => gerarCertidaoAssociado(item, 'inteiro_teor')} title="Certidão de inteiro teor"><FileText size={16}/></button><button className="rounded-xl bg-purple-50 p-2 text-purple-700" onClick={() => enviarFichaParaAssinatura(item)} title="Ficha assinável"><FileSignature size={16}/></button>{podeEditar && <button className="rounded-xl bg-red-50 p-2 text-red-700 hover:bg-red-100" onClick={() => excluir(item.id)} title="Excluir"><Trash2 size={16}/></button>}</div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </PageShell>
  );
}
