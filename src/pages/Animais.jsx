import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Camera,
  CreditCard,
  Edit3,
  ExternalLink,
  FileDown,
  FileSignature,
  HeartPulse,
  PawPrint,
  Plus,
  QrCode,
  RefreshCw,
  Save,
  ShieldCheck,
  Stethoscope,
  Trash2,
  Upload,
  X
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { canEdit } from '../lib/permissions';
import { uploadArquivo, abrirArquivoPrivado, obterUrlsPrivadas } from '../lib/storage';
import { htmlFichaRGAAssinavel, imprimirCarteirinhaAnimal, imprimirFichaRGA, imprimirProntuarioAnimal } from '../lib/printDocs';
import { dateBR } from '../lib/format';
import { abrirDocumentoFinalPorId } from '../lib/documentoFinal';
import PageShell from '../components/PageShell';
import EmptyState from '../components/EmptyState';

const inicial = {
  id: null,
  associado_id: '',
  nome_animal: '',
  rga: '',
  especie: 'Equino',
  raca: '',
  sexo: '',
  data_nascimento: '',
  idade_estimada: '',
  porte: '',
  peso_estimado: '',
  cor_pelagem: '',
  marcas_especificas: '',
  finalidade_uso: '',
  status_rga: 'pendente',
  condicao_geral: 'pendente_vistoria',
  exame_aie_status: '',
  exame_aie_data: '',
  exame_aie_validade: '',
  exame_aie_pdf_path: '',
  exame_mormo_status: '',
  exame_mormo_data: '',
  exame_mormo_validade: '',
  exame_mormo_pdf_path: '',
  vacinas_status: '',
  vacinas_data: '',
  vacinas_validade: '',
  vacinas_pdf_path: '',
  vermifugacao_data: '',
  vermifugacao_validade: '',
  atendimento_veterinario_ultimo: '',
  estado_fisico_status: '',
  cascos_status: '',
  data_vistoria: '',
  responsavel_vistoria: '',
  proxima_vistoria: '',
  visto_veterinario: '',
  ficha_rga_pdf_path: '',
  ficha_rga_pdf_url: '',
  ficha_rga_assinada_documento_id: '',
  ficha_rga_assinada_em: '',
  foto_lateral_esquerda_path: '',
  foto_lateral_direita_path: '',
  foto_frontal_path: '',
  foto_traseira_path: '',
  foto_marcas_path: '',
  foto_carroca_path: '',
  observacoes_veterinarias: '',
  cadastrado_por_nome: '',
  cadastrado_por_email: '',
  atualizado_por_nome: '',
  atualizado_por_email: ''
};

const inicialVistoria = {
  data_vistoria: new Date().toISOString().slice(0, 10),
  responsavel: '',
  estado_fisico: 'apto',
  cascos_ferraduras: 'bom',
  resultado: 'apto',
  proxima_vistoria: '',
  observacoes: '',
  arquivo_pdf_path: ''
};

const inicialSanitario = {
  tipo: 'AIE',
  descricao: '',
  situacao: 'negativo',
  data_registro: new Date().toISOString().slice(0, 10),
  validade: '',
  responsavel: '',
  observacoes: '',
  arquivo_pdf_path: ''
};

const CAMPOS_ARQUIVOS = [
  'ficha_rga_pdf_path',
  'exame_aie_pdf_path',
  'exame_mormo_pdf_path',
  'vacinas_pdf_path',
  'foto_lateral_esquerda_path',
  'foto_lateral_direita_path',
  'foto_frontal_path',
  'foto_traseira_path',
  'foto_marcas_path',
  'foto_carroca_path'
];


const CAMPOS_DATA_ANIMAL = [
  'data_nascimento',
  'data_vistoria',
  'proxima_vistoria',
  'exame_aie_data',
  'exame_aie_validade',
  'exame_mormo_data',
  'exame_mormo_validade',
  'vacinas_data',
  'vacinas_validade',
  'vermifugacao_data',
  'vermifugacao_validade',
  'atendimento_veterinario_ultimo',
  'ficha_rga_assinada_em'
];

const CAMPOS_UUID_ANIMAL = [
  'ficha_rga_assinada_documento_id'
];

const CAMPOS_SELECT_OPCIONAIS_ANIMAL = [
  'exame_aie_status',
  'exame_mormo_status',
  'vacinas_status',
  'estado_fisico_status',
  'cascos_status'
];

function limparPayloadAnimal(payload) {
  const limpo = { ...payload };

  for (const campo of CAMPOS_DATA_ANIMAL) {
    if (limpo[campo] === '') limpo[campo] = null;
  }

  for (const campo of CAMPOS_SELECT_OPCIONAIS_ANIMAL) {
    if (limpo[campo] === '') limpo[campo] = null;
  }

  if (limpo.associado_id === '') limpo.associado_id = null;

  for (const campo of CAMPOS_UUID_ANIMAL) {
    if (limpo[campo] === '') limpo[campo] = null;
  }

  return limpo;
}

function mensagemErroSupabase(error) {
  return [
    error?.message,
    error?.details ? `Detalhes: ${error.details}` : '',
    error?.hint ? `Dica: ${error.hint}` : '',
    error?.code ? `Código: ${error.code}` : ''
  ].filter(Boolean).join('\n');
}

const CAMPOS_FOTOS = [
  ['foto_lateral_esquerda_path', 'Foto lateral esquerda'],
  ['foto_lateral_direita_path', 'Foto lateral direita'],
  ['foto_frontal_path', 'Foto frontal'],
  ['foto_traseira_path', 'Foto traseira'],
  ['foto_marcas_path', 'Foto das marcas específicas'],
  ['foto_carroca_path', 'Foto da carroça/conjunto']
];

function normalizar(item = {}) {
  return { ...inicial, ...item, associado_id: item.associado_id || '' };
}

function labelStatus(value) {
  const mapa = {
    pendente: 'Pendente', ativo: 'Ativo', suspenso: 'Suspenso', inativo: 'Inativo',
    apto: 'Apto', inapto: 'Inapto', em_observacao: 'Em observação', pendente_vistoria: 'Pendente de vistoria',
    negativo: 'Negativo', positivo: 'Positivo', em_dia: 'Em dia', realizado: 'Realizado', vencido: 'Vencido',
    bom: 'Bom', regular: 'Regular', ruim: 'Ruim', observacao: 'Observação'
  };
  return mapa[value] || value || '-';
}

function diasPara(data) {
  if (!data) return null;
  const hoje = new Date();
  const alvo = new Date(`${data}T00:00:00`);
  if (Number.isNaN(alvo.getTime())) return null;
  hoje.setHours(0, 0, 0, 0);
  return Math.ceil((alvo.getTime() - hoje.getTime()) / 86400000);
}

function classeAlerta(data) {
  const dias = diasPara(data);
  if (dias === null) return 'bg-slate-50 text-slate-600 ring-slate-100';
  if (dias < 0) return 'bg-red-50 text-red-700 ring-red-100';
  if (dias <= 30) return 'bg-amber-50 text-amber-700 ring-amber-100';
  return 'bg-green-50 text-green-700 ring-green-100';
}

function textoValidade(label, data) {
  const dias = diasPara(data);
  if (dias === null) return `${label}: sem validade`;
  if (dias < 0) return `${label}: vencido há ${Math.abs(dias)} dia(s)`;
  if (dias <= 30) return `${label}: vence em ${dias} dia(s)`;
  return `${label}: ${dateBR(data)}`;
}

async function sha256(texto = '') {
  const bytes = new TextEncoder().encode(texto);
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function Badge({ children, className = '' }) {
  return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-black ring-1 ${className}`}>{children}</span>;
}

function CampoArquivo({ label, campo, arquivo, onChange, path, aceitar = 'application/pdf', disabled }) {
  return (
    <div>
      <label className="label">{label}</label>
      <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
        <input type="file" accept={aceitar} disabled={disabled} className="field" onChange={(e) => onChange(campo, e.target.files?.[0] || null)} />
        <button type="button" className="btn-secondary" disabled={!path} onClick={() => abrirArquivoPrivado(path)}><Upload size={16} /> Abrir</button>
      </div>
      {arquivo && <p className="mt-1 text-xs font-semibold text-floresta">Selecionado: {arquivo.name}</p>}
    </div>
  );
}


async function consultarOpcional(query) {
  try {
    const resultado = await query;
    return resultado || { data: [], error: null };
  } catch (error) {
    return { data: [], error: null };
  }
}

export default function Animais({ profile }) {
  const [animais, setAnimais] = useState([]);
  const [associados, setAssociados] = useState([]);
  const [alertas, setAlertas] = useState([]);
  const [form, setForm] = useState(inicial);
  const [arquivos, setArquivos] = useState({});
  const [vistorias, setVistorias] = useState([]);
  const [controles, setControles] = useState([]);
  const [vistoriaForm, setVistoriaForm] = useState(inicialVistoria);
  const [sanitarioForm, setSanitarioForm] = useState(inicialSanitario);
  const [arquivoVistoria, setArquivoVistoria] = useState(null);
  const [arquivoSanitario, setArquivoSanitario] = useState(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const podeEditar = canEdit(profile, 'animais');
  const editando = Boolean(form.id);
  const rgaPendenteVistoria = form.condicao_geral === 'pendente_vistoria';

  useEffect(() => { carregar(); }, []);

  const animalSelecionadoLista = useMemo(() => animais.find((a) => a.id === form.id), [animais, form.id]);
  const animalAtual = { ...animalSelecionadoLista, ...form, associados: associados.find((a) => a.id === form.associado_id) || animalSelecionadoLista?.associados || {} };

  async function carregar() {
    setLoading(true);
    const [{ data: animaisData, error: animaisError }, { data: associadosData }, alertasResp] = await Promise.all([
      supabase.from('animais').select('*, associados(*)').order('created_at', { ascending: false }),
      supabase.from('associados').select('id, nome_completo, matricula, numero_ficha, cpf, telefone_whatsapp, endereco_residencial, rua_logradouro, numero, complemento, bairro, cidade, uf, cep, status').order('nome_completo'),
      consultarOpcional(supabase.from('alertas_animais').select('*').limit(20))
    ]);

    if (animaisError) alert('Erro ao carregar animais: ' + animaisError.message);
    setAnimais(animaisData || []);
    setAssociados(associadosData || []);
    setAlertas(alertasResp?.data || []);
    setLoading(false);
  }

  async function carregarProntuario(animalId) {
    if (!animalId) {
      setVistorias([]);
      setControles([]);
      return;
    }

    const [{ data: vistoriasData, error: vistoriaError }, { data: controlesData, error: controleError }] = await Promise.all([
      supabase.from('animal_vistorias').select('*').eq('animal_id', animalId).order('data_vistoria', { ascending: false }),
      supabase.from('animal_controle_sanitario').select('*').eq('animal_id', animalId).order('data_registro', { ascending: false })
    ]);

    if (vistoriaError || controleError) {
      setMsg('Prontuário ainda não disponível. Verifique se a atualização v5.sql foi executada no Supabase.');
    }
    setVistorias(vistoriasData || []);
    setControles(controlesData || []);
  }

  function limparForm() {
    setForm(inicial);
    setArquivos({});
    setVistorias([]);
    setControles([]);
    setVistoriaForm(inicialVistoria);
    setSanitarioForm(inicialSanitario);
    setArquivoVistoria(null);
    setArquivoSanitario(null);
    setMsg('');
  }

  function editar(item) {
    setForm(normalizar(item));
    setArquivos({});
    setMsg('Editando animal/RGA. O prontuário será carregado abaixo do cadastro.');
    carregarProntuario(item.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function setArquivoCampo(campo, file) {
    setArquivos((atual) => ({ ...atual, [campo]: file }));
  }

  async function prepararPayloadComUploads() {
    const payload = {
      ...form,
      associado_id: form.associado_id || null,
      atualizado_por_nome: profile?.nome || profile?.email || '',
      atualizado_por_email: profile?.email || '',
      updated_at: new Date().toISOString()
    };
    if (!editando) {
      payload.cadastrado_por_nome = profile?.nome || profile?.email || '';
      payload.cadastrado_por_email = profile?.email || '';
    }

    for (const campo of CAMPOS_ARQUIVOS) {
      const file = arquivos[campo];
      if (!file) continue;
      const pasta = campo.startsWith('foto_') ? 'animais/fotos' : campo.includes('exame') || campo.includes('vacinas') ? 'animais/exames' : 'animais/rga';
      const { path, error } = await uploadArquivo(file, pasta);
      if (error) throw new Error(`Erro ao enviar ${campo}: ${error.message}`);
      payload[campo] = path;
    }

    delete payload.id;
    delete payload.created_at;
    delete payload.associados;
    return limparPayloadAnimal(payload);
  }

  async function salvar(e) {
    e.preventDefault();
    if (!podeEditar) return;
    setLoading(true);
    try {
      const payload = await prepararPayloadComUploads();
      const query = editando
        ? supabase.from('animais').update(payload).eq('id', form.id).select('*, associados(*)').single()
        : supabase.from('animais').insert(payload).select('*, associados(*)').single();

      const { data, error } = await query;
      if (error) throw error;
      setMsg(editando ? 'Cadastro e prontuário base atualizados.' : 'Animal/RGA cadastrado. Agora você pode adicionar vistorias e controle sanitário.');
      setArquivos({});
      setForm(normalizar(data));
      await carregar();
      await carregarProntuario(data.id);
    } catch (error) {
      alert('Erro ao salvar animal/RGA:\n' + mensagemErroSupabase(error));
    } finally {
      setLoading(false);
    }
  }

  async function excluir(id) {
    if (!podeEditar) return;
    if (!confirm('Excluir cadastro do animal/RGA? Isso também remove o prontuário vinculado.')) return;
    const { error } = await supabase.from('animais').delete().eq('id', id);
    if (error) alert('Erro ao excluir: ' + error.message);
    limparForm();
    await carregar();
  }

  async function salvarVistoria(e) {
    e.preventDefault();
    if (!form.id || !podeEditar) return;
    setLoading(true);
    try {
      let arquivo_pdf_path = '';
      if (arquivoVistoria) {
        const { path, error } = await uploadArquivo(arquivoVistoria, 'animais/vistorias');
        if (error) throw error;
        arquivo_pdf_path = path;
      }

      const payload = { ...vistoriaForm, animal_id: form.id, arquivo_pdf_path };
      const { error } = await supabase.from('animal_vistorias').insert(payload);
      if (error) throw error;

      await supabase.from('animais').update({
        data_vistoria: vistoriaForm.data_vistoria || null,
        responsavel_vistoria: vistoriaForm.responsavel || null,
        estado_fisico_status: vistoriaForm.estado_fisico === 'em_observacao' ? 'apto' : vistoriaForm.estado_fisico,
        cascos_status: vistoriaForm.cascos_ferraduras === 'regular' ? 'bom' : vistoriaForm.cascos_ferraduras,
        condicao_geral: vistoriaForm.resultado === 'pendente' ? 'pendente_vistoria' : vistoriaForm.resultado === 'suspenso' ? 'inapto' : vistoriaForm.resultado,
        proxima_vistoria: vistoriaForm.proxima_vistoria || null,
        updated_at: new Date().toISOString()
      }).eq('id', form.id);

      setVistoriaForm(inicialVistoria);
      setArquivoVistoria(null);
      setMsg('Vistoria adicionada ao prontuário.');
      await carregar();
      await carregarProntuario(form.id);
    } catch (error) {
      alert('Erro ao salvar vistoria: ' + error.message);
    } finally {
      setLoading(false);
    }
  }

  async function salvarControleSanitario(e) {
    e.preventDefault();
    if (!form.id || !podeEditar) return;
    setLoading(true);
    try {
      let arquivo_pdf_path = '';
      if (arquivoSanitario) {
        const { path, error } = await uploadArquivo(arquivoSanitario, 'animais/sanitario');
        if (error) throw error;
        arquivo_pdf_path = path;
      }

      const payload = { ...sanitarioForm, animal_id: form.id, arquivo_pdf_path };
      const { error } = await supabase.from('animal_controle_sanitario').insert(payload);
      if (error) throw error;

      const updateAnimal = { updated_at: new Date().toISOString() };
      if (sanitarioForm.tipo === 'AIE') {
        updateAnimal.exame_aie_status = sanitarioForm.situacao || null;
        updateAnimal.exame_aie_data = sanitarioForm.data_registro || null;
        updateAnimal.exame_aie_validade = sanitarioForm.validade || null;
        if (arquivo_pdf_path) updateAnimal.exame_aie_pdf_path = arquivo_pdf_path;
      }
      if (sanitarioForm.tipo === 'MORMO') {
        updateAnimal.exame_mormo_status = sanitarioForm.situacao || null;
        updateAnimal.exame_mormo_data = sanitarioForm.data_registro || null;
        updateAnimal.exame_mormo_validade = sanitarioForm.validade || null;
        if (arquivo_pdf_path) updateAnimal.exame_mormo_pdf_path = arquivo_pdf_path;
      }
      if (sanitarioForm.tipo === 'VACINA') {
        updateAnimal.vacinas_status = sanitarioForm.situacao === 'vencido' ? 'pendente' : sanitarioForm.situacao === 'em_dia' ? 'em_dia' : sanitarioForm.situacao || null;
        updateAnimal.vacinas_data = sanitarioForm.data_registro || null;
        updateAnimal.vacinas_validade = sanitarioForm.validade || null;
        if (arquivo_pdf_path) updateAnimal.vacinas_pdf_path = arquivo_pdf_path;
      }
      if (sanitarioForm.tipo === 'VERMIFUGACAO') {
        updateAnimal.vermifugacao_data = sanitarioForm.data_registro || null;
        updateAnimal.vermifugacao_validade = sanitarioForm.validade || null;
      }
      if (sanitarioForm.tipo === 'ATENDIMENTO') {
        updateAnimal.atendimento_veterinario_ultimo = sanitarioForm.data_registro || null;
      }
      await supabase.from('animais').update(updateAnimal).eq('id', form.id);

      setSanitarioForm(inicialSanitario);
      setArquivoSanitario(null);
      setMsg('Registro sanitário adicionado ao prontuário.');
      await carregar();
      await carregarProntuario(form.id);
    } catch (error) {
      alert('Erro ao salvar controle sanitário: ' + error.message);
    } finally {
      setLoading(false);
    }
  }

  async function excluirVistoria(id) {
    if (!podeEditar || !confirm('Excluir vistoria do prontuário?')) return;
    const { error } = await supabase.from('animal_vistorias').delete().eq('id', id);
    if (error) alert('Erro ao excluir: ' + error.message);
    await carregarProntuario(form.id);
  }

  async function excluirControle(id) {
    if (!podeEditar || !confirm('Excluir registro sanitário?')) return;
    const { error } = await supabase.from('animal_controle_sanitario').delete().eq('id', id);
    if (error) alert('Erro ao excluir: ' + error.message);
    await carregarProntuario(form.id);
  }

  async function gerarProntuario(animal = animalAtual, vistoriasBase = vistorias, controlesBase = controles) {
    const fotos = await obterUrlsPrivadas({
      foto_lateral_esquerda_path: animal.foto_lateral_esquerda_path,
      foto_lateral_direita_path: animal.foto_lateral_direita_path,
      foto_frontal_path: animal.foto_frontal_path,
      foto_traseira_path: animal.foto_traseira_path,
      foto_marcas_path: animal.foto_marcas_path,
      foto_carroca_path: animal.foto_carroca_path
    });
    await imprimirProntuarioAnimal(animal, vistoriasBase, controlesBase, fotos, profile);
  }

  async function gerarProntuarioPorAnimal(animal) {
    const [{ data: vistoriasData }, { data: controlesData }] = await Promise.all([
      supabase.from('animal_vistorias').select('*').eq('animal_id', animal.id).order('data_vistoria', { ascending: false }),
      supabase.from('animal_controle_sanitario').select('*').eq('animal_id', animal.id).order('data_registro', { ascending: false })
    ]);
    await gerarProntuario(animal, vistoriasData || [], controlesData || []);
  }

  async function gerarFicha(animal = animalAtual) {
    await imprimirFichaRGA(animal, profile);
  }

  async function gerarCarteirinhaAnimal(animal = animalAtual) {
    await imprimirCarteirinhaAnimal(animal, profile);
  }

  async function enviarRgaParaAssinatura(animal = animalAtual) {
    if (!podeEditar || !animal?.id) return;
    setLoading(true);
    try {
      const associado = animal.associados || associados.find(a => a.id === animal.associado_id) || {};
      const conteudo = await htmlFichaRGAAssinavel({ ...animal, associados: associado }, profile);
      const hash = await sha256(`${animal.id}|${conteudo}`);
      const { data: doc, error } = await supabase.from('documentos_processos').insert({
        modelo_slug: 'ficha_rga',
        tipo_documento: 'Ficha RGA',
        titulo: `Ficha RGA - ${animal.nome_animal || animal.rga || 'Animal AAC'}`,
        data_documento: new Date().toISOString().slice(0, 10),
        status: 'em_assinatura',
        interessado: associado.nome_completo || animal.nome_animal || '',
        interessado_associado_id: associado.id || null,
        animal_id: animal.id,
        origem_sistema: 'animal_rga',
        origem_id: animal.id,
        conteudo_html: conteudo,
        documento_original_html: conteudo,
        documento_original_hash: hash,
        texto_pesquisa: `${animal.nome_animal || ''} ${animal.rga || ''} ${associado.nome_completo || ''}`,
        hash_documento: hash,
        cadastrado_por_nome: profile?.nome || profile?.email || '',
        cadastrado_por_email: profile?.email || '',
        atualizado_por_nome: profile?.nome || profile?.email || '',
        atualizado_por_email: profile?.email || ''
      }).select('*').single();
      if (error) throw error;
      if (associado.id) {
        const { error: assinanteError } = await supabase.from('documento_assinantes').insert({
          documento_id: doc.id,
          associado_id: associado.id,
          nome: associado.nome_completo || '',
          cpf: associado.cpf || '',
          telefone_whatsapp: associado.telefone_whatsapp || '',
          email: associado.email || '',
          cargo: 'Associado responsavel pelo animal',
          tipo_assinatura: 'assinatura',
          obrigatorio: true,
          ordem: 1,
          token_acesso: crypto.randomUUID(),
          status: 'pendente'
        });
        if (assinanteError) throw assinanteError;
      }
      alert('Ficha RGA enviada para Documentos e Processos como documento assinável.');
    } catch (error) {
      alert('Erro ao criar RGA assinável: ' + (error?.message || error));
    } finally {
      setLoading(false);
    }
  }

  async function abrirRgaAssinado(animal = animalAtual) {
    if (!animal?.ficha_rga_assinada_documento_id) {
      await imprimirFichaRGA(animal, profile);
      return;
    }
    setLoading(true);
    const { error } = await abrirDocumentoFinalPorId(supabase, animal.ficha_rga_assinada_documento_id);
    if (error) alert('Erro ao abrir RGA assinado:\n' + (error.message || error));
    setLoading(false);
  }

  return (
    <PageShell
      eyebrow="Bem-Estar Animal"
      title="Animais, RGA e Prontuário"
      description="Controle completo de equinos, fotos, vistorias, exames, vacinas, alertas sanitários e ficha RGA com QR Code."
      action={<button className="btn-secondary" onClick={carregar}><RefreshCw size={17} /> {loading ? 'Carregando...' : 'Atualizar'}</button>}
    >
      {alertas.length > 0 && (
        <div className="mb-7 rounded-[2rem] border border-amber-100 bg-amber-50 p-5 text-amber-800">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div className="flex gap-3">
              <AlertTriangle className="mt-1" />
              <div>
                <h2 className="text-lg font-black">Alertas de Bem-Estar Animal</h2>
                <p className="text-sm">Existem {alertas.length} registro(s) com pendência, validade próxima/vencida ou RGA suspenso.</p>
              </div>
            </div>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {alertas.slice(0, 6).map((a) => (
              <button key={a.id} type="button" onClick={() => editar(animais.find((item) => item.id === a.id) || a)} className="rounded-2xl bg-white p-4 text-left shadow-sm ring-1 ring-amber-100">
                <p className="font-black text-floresta">{a.nome_animal || 'Animal sem nome'} • {a.rga || 'Sem RGA'}</p>
                <p className="text-sm font-bold text-amber-700">{a.alerta_principal}</p>
                <p className="text-xs text-slate-500">{a.proprietario_nome || 'Sem responsável vinculado'}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {podeEditar && (
        <form onSubmit={salvar} className="card mb-7 p-5">
          <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-2 text-floresta"><PawPrint size={20} /><h2 className="text-xl font-black">{editando ? 'Editar animal / RGA' : 'Novo animal / RGA'}</h2></div>
            {editando && <button type="button" className="btn-secondary" onClick={limparForm}><X size={16}/> Cancelar edição</button>}
          </div>

          {msg && <div className="mb-5 rounded-2xl border border-green-100 bg-green-50 p-4 text-sm font-bold text-green-700">{msg}</div>}

          <div className="mb-5 rounded-3xl bg-creme/70 p-4">
            <h3 className="mb-4 flex items-center gap-2 font-black text-floresta"><ShieldCheck size={18} /> Identificação do animal e vínculo com associado</h3>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="md:col-span-2"><label className="label">Associado responsável</label><select className="field" value={form.associado_id} onChange={e => setForm({...form, associado_id: e.target.value})}><option value="">Selecione</option>{associados.map(a => <option key={a.id} value={a.id}>{a.nome_completo} {a.matricula ? `• ${a.matricula}` : ''}</option>)}</select></div>
              <div><label className="label">Número RGA</label><input className="field" value={form.rga || ''} onChange={e => setForm({...form, rga: e.target.value})} placeholder="Gerado automaticamente" /><p className="mt-1 text-xs font-semibold text-slate-500">Deixe em branco para gerar ao salvar.</p></div>
              <div><label className="label">Status do RGA</label><select className="field" value={form.status_rga} onChange={e => setForm({...form, status_rga: e.target.value})}><option value="pendente">Pendente</option><option value="ativo">Ativo</option><option value="suspenso">Suspenso</option><option value="inativo">Inativo</option></select></div>
              <div><label className="label">Nome do animal</label><input className="field" value={form.nome_animal} onChange={e => setForm({...form, nome_animal: e.target.value})} required /></div>
              <div><label className="label">Espécie</label><input className="field" value={form.especie || ''} onChange={e => setForm({...form, especie: e.target.value})} placeholder="Equino" /></div>
              <div><label className="label">Raça</label><input className="field" value={form.raca || ''} onChange={e => setForm({...form, raca: e.target.value})} /></div>
              <div><label className="label">Sexo</label><select className="field" value={form.sexo || ''} onChange={e => setForm({...form, sexo: e.target.value})}><option value="">Selecione</option><option value="Macho">Macho</option><option value="Fêmea">Fêmea</option><option value="Castrado">Castrado</option></select></div>
              <div><label className="label">Data de nascimento</label><input type="date" className="field" value={form.data_nascimento || ''} onChange={e => setForm({...form, data_nascimento: e.target.value})} /></div>
              <div><label className="label">Idade aproximada</label><input className="field" value={form.idade_estimada || ''} onChange={e => setForm({...form, idade_estimada: e.target.value})} /></div>
              <div><label className="label">Porte</label><input className="field" value={form.porte || ''} onChange={e => setForm({...form, porte: e.target.value})} placeholder="Pequeno, médio, grande" /></div>
              <div><label className="label">Peso estimado</label><input className="field" value={form.peso_estimado || ''} onChange={e => setForm({...form, peso_estimado: e.target.value})} placeholder="Ex: 380 kg" /></div>
              <div><label className="label">Pelagem / cor</label><input className="field" value={form.cor_pelagem || ''} onChange={e => setForm({...form, cor_pelagem: e.target.value})} /></div>
              <div><label className="label">Finalidade de uso</label><input className="field" value={form.finalidade_uso || ''} onChange={e => setForm({...form, finalidade_uso: e.target.value})} placeholder="Frete, apoio, passeio..." /></div>
              <div><label className="label">Condição geral</label><select className="field" value={form.condicao_geral || ''} onChange={e => setForm({...form, condicao_geral: e.target.value})}><option value="pendente_vistoria">Pendente de vistoria</option><option value="apto">Apto</option><option value="inapto">Inapto</option><option value="em_observacao">Em observação</option></select></div>
              <div className="md:col-span-2 xl:col-span-4"><label className="label">Marcas específicas</label><input className="field" value={form.marcas_especificas || ''} onChange={e => setForm({...form, marcas_especificas: e.target.value})} placeholder="Ex: estrela na testa, calçado nos pés, cicatrizes..." /></div>
            </div>
          </div>

          <div className="mb-5 rounded-3xl bg-white/80 p-4 ring-1 ring-slate-100">
            <h3 className="mb-4 flex items-center gap-2 font-black text-floresta"><HeartPulse size={18} /> Controle sanitário resumido</h3>
            {rgaPendenteVistoria && (
              <div className="mb-4 rounded-2xl border border-amber-100 bg-amber-50 p-3 text-sm font-bold text-amber-800">
                RGA marcado como <strong>pendente de vistoria</strong>: campos veterinários, exames, datas de vistoria, PDFs e visto veterinário ficam opcionais até a AAC possuir responsável técnico/veterinário para avaliação.
              </div>
            )}
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div><label className="label">Data da última vistoria</label><input type="date" className="field" value={form.data_vistoria || ''} onChange={e => setForm({...form, data_vistoria: e.target.value})} /></div>
              <div><label className="label">Próxima vistoria</label><input type="date" className="field" value={form.proxima_vistoria || ''} onChange={e => setForm({...form, proxima_vistoria: e.target.value})} /></div>
              <div><label className="label">Responsável/veterinário</label><input className="field" value={form.responsavel_vistoria || ''} onChange={e => setForm({...form, responsavel_vistoria: e.target.value})} /></div>
              <div><label className="label">Visto veterinário</label><input className="field" value={form.visto_veterinario || ''} onChange={e => setForm({...form, visto_veterinario: e.target.value})} /></div>
              <div><label className="label">Exame AIE</label><select className="field" value={form.exame_aie_status || ''} onChange={e => setForm({...form, exame_aie_status: e.target.value})}><option value="">Não informado</option><option value="negativo">Negativo</option><option value="positivo">Positivo</option></select></div>
              <div><label className="label">Data AIE</label><input type="date" className="field" value={form.exame_aie_data || ''} onChange={e => setForm({...form, exame_aie_data: e.target.value})} /></div>
              <div><label className="label">Validade AIE</label><input type="date" className="field" value={form.exame_aie_validade || ''} onChange={e => setForm({...form, exame_aie_validade: e.target.value})} /></div>
              <CampoArquivo label="PDF AIE" campo="exame_aie_pdf_path" arquivo={arquivos.exame_aie_pdf_path} onChange={setArquivoCampo} path={form.exame_aie_pdf_path} />
              <div><label className="label">Exame Mormo</label><select className="field" value={form.exame_mormo_status || ''} onChange={e => setForm({...form, exame_mormo_status: e.target.value})}><option value="">Não informado</option><option value="negativo">Negativo</option><option value="positivo">Positivo</option></select></div>
              <div><label className="label">Data Mormo</label><input type="date" className="field" value={form.exame_mormo_data || ''} onChange={e => setForm({...form, exame_mormo_data: e.target.value})} /></div>
              <div><label className="label">Validade Mormo</label><input type="date" className="field" value={form.exame_mormo_validade || ''} onChange={e => setForm({...form, exame_mormo_validade: e.target.value})} /></div>
              <CampoArquivo label="PDF Mormo" campo="exame_mormo_pdf_path" arquivo={arquivos.exame_mormo_pdf_path} onChange={setArquivoCampo} path={form.exame_mormo_pdf_path} />
              <div><label className="label">Vacinas</label><select className="field" value={form.vacinas_status || ''} onChange={e => setForm({...form, vacinas_status: e.target.value})}><option value="">Não informado</option><option value="em_dia">Em dia</option><option value="pendente">Pendente</option></select></div>
              <div><label className="label">Data vacinação</label><input type="date" className="field" value={form.vacinas_data || ''} onChange={e => setForm({...form, vacinas_data: e.target.value})} /></div>
              <div><label className="label">Validade vacinas</label><input type="date" className="field" value={form.vacinas_validade || ''} onChange={e => setForm({...form, vacinas_validade: e.target.value})} /></div>
              <CampoArquivo label="PDF vacinas" campo="vacinas_pdf_path" arquivo={arquivos.vacinas_pdf_path} onChange={setArquivoCampo} path={form.vacinas_pdf_path} />
              <div><label className="label">Vermifugação</label><input type="date" className="field" value={form.vermifugacao_data || ''} onChange={e => setForm({...form, vermifugacao_data: e.target.value})} /></div>
              <div><label className="label">Validade vermifugação</label><input type="date" className="field" value={form.vermifugacao_validade || ''} onChange={e => setForm({...form, vermifugacao_validade: e.target.value})} /></div>
              <div><label className="label">Último atendimento veterinário</label><input type="date" className="field" value={form.atendimento_veterinario_ultimo || ''} onChange={e => setForm({...form, atendimento_veterinario_ultimo: e.target.value})} /></div>
              <CampoArquivo label="Ficha RGA assinada" campo="ficha_rga_pdf_path" arquivo={arquivos.ficha_rga_pdf_path} onChange={setArquivoCampo} path={form.ficha_rga_pdf_path || form.ficha_rga_pdf_url} />
              {form.ficha_rga_assinada_documento_id && <div className="md:col-span-2 xl:col-span-3 flex flex-col gap-3 rounded-2xl border border-green-100 bg-green-50 p-3 text-sm font-bold text-green-700 md:flex-row md:items-center md:justify-between"><span>Ficha RGA assinada pela Mesa de Assinaturas e arquivada neste cadastro em {dateBR(form.ficha_rga_assinada_em)}.</span><button type="button" className="btn-secondary bg-white" onClick={() => abrirRgaAssinado()}><FileDown size={16}/> Abrir RGA assinado</button></div>}
            </div>
          </div>

          <div className="mb-5 rounded-3xl bg-white/80 p-4 ring-1 ring-slate-100">
            <h3 className="mb-4 flex items-center gap-2 font-black text-floresta"><Camera size={18} /> Fotos do animal e da carroça</h3>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {CAMPOS_FOTOS.map(([campo, label]) => (
                <CampoArquivo key={campo} label={label} campo={campo} arquivo={arquivos[campo]} onChange={setArquivoCampo} path={form[campo]} aceitar="image/*" />
              ))}
            </div>
          </div>

          <div className="md:col-span-2 xl:col-span-4"><label className="label">Observações veterinárias</label><textarea className="field" value={form.observacoes_veterinarias || ''} onChange={e => setForm({...form, observacoes_veterinarias: e.target.value})}></textarea></div>

          <div className="mt-5 flex flex-wrap gap-3">
            <button className="btn-primary" disabled={loading}><Save size={18} /> {editando ? 'Salvar alterações' : 'Salvar animal'}</button>
            <button type="button" className="btn-secondary" onClick={() => abrirRgaAssinado()}><FileDown size={18} /> {form.ficha_rga_assinada_documento_id ? 'Gerar RGA assinado' : 'Gerar ficha RGA'}</button>
            <button type="button" className="btn-secondary" disabled={!editando} onClick={() => gerarCarteirinhaAnimal()}><CreditCard size={18} /> Carteirinha animal</button>
            <button type="button" className="btn-secondary" disabled={!editando} onClick={() => enviarRgaParaAssinatura()}><FileSignature size={18} /> RGA assinável</button>
            <button type="button" className="btn-secondary" disabled={!editando} onClick={() => gerarProntuario()}><FileDown size={18} /> Gerar prontuário completo</button>
            <a className="btn-secondary" href="/modelo-ficha-rga.pdf" target="_blank" rel="noreferrer"><ExternalLink size={16}/> Modelo RGA</a>
          </div>
        </form>
      )}

      {editando && (
        <div className="mb-7 grid gap-6 xl:grid-cols-2">
          <section className="card p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div><h2 className="flex items-center gap-2 text-xl font-black text-floresta"><Stethoscope size={20}/> Histórico de vistorias</h2><p className="text-sm text-slate-500">Registre cada vistoria técnica realizada no animal.</p></div>
            </div>
            {podeEditar && (
              <form onSubmit={salvarVistoria} className="mb-5 grid gap-3 rounded-3xl bg-creme/60 p-4 md:grid-cols-2">
                <div><label className="label">Data da vistoria</label><input type="date" className="field" value={vistoriaForm.data_vistoria} onChange={e => setVistoriaForm({...vistoriaForm, data_vistoria: e.target.value})} required /></div>
                <div><label className="label">Responsável</label><input className="field" value={vistoriaForm.responsavel} onChange={e => setVistoriaForm({...vistoriaForm, responsavel: e.target.value})} /></div>
                <div><label className="label">Estado físico</label><select className="field" value={vistoriaForm.estado_fisico} onChange={e => setVistoriaForm({...vistoriaForm, estado_fisico: e.target.value})}><option value="apto">Apto</option><option value="inapto">Inapto</option><option value="em_observacao">Em observação</option></select></div>
                <div><label className="label">Cascos/ferraduras</label><select className="field" value={vistoriaForm.cascos_ferraduras} onChange={e => setVistoriaForm({...vistoriaForm, cascos_ferraduras: e.target.value})}><option value="bom">Bom</option><option value="regular">Regular</option><option value="ruim">Ruim</option></select></div>
                <div><label className="label">Resultado</label><select className="field" value={vistoriaForm.resultado} onChange={e => setVistoriaForm({...vistoriaForm, resultado: e.target.value})}><option value="apto">Apto</option><option value="inapto">Inapto</option><option value="pendente">Pendente</option><option value="suspenso">Suspenso</option></select></div>
                <div><label className="label">Próxima vistoria</label><input type="date" className="field" value={vistoriaForm.proxima_vistoria} onChange={e => setVistoriaForm({...vistoriaForm, proxima_vistoria: e.target.value})} /></div>
                <div className="md:col-span-2"><label className="label">Observações</label><textarea className="field" value={vistoriaForm.observacoes} onChange={e => setVistoriaForm({...vistoriaForm, observacoes: e.target.value})}></textarea></div>
                <div><label className="label">Anexo da vistoria</label><input type="file" accept="application/pdf,image/*" className="field" onChange={e => setArquivoVistoria(e.target.files?.[0] || null)} /></div>
                <div className="flex items-end"><button className="btn-primary w-full" disabled={loading}><Plus size={18}/> Adicionar vistoria</button></div>
              </form>
            )}
            {vistorias.length === 0 ? <EmptyState>Nenhuma vistoria registrada.</EmptyState> : (
              <div className="space-y-3">
                {vistorias.map((v) => (
                  <div key={v.id} className="rounded-3xl border border-slate-100 bg-white p-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div><p className="font-black text-floresta">{dateBR(v.data_vistoria)} • {labelStatus(v.resultado)}</p><p className="text-sm text-slate-600">Responsável: {v.responsavel || '-'}</p><p className="text-sm text-slate-600">Estado físico: {labelStatus(v.estado_fisico)} • Cascos: {labelStatus(v.cascos_ferraduras)}</p><p className="text-sm text-slate-600">Próxima: {dateBR(v.proxima_vistoria)}</p>{v.observacoes && <p className="mt-2 text-sm text-slate-700">{v.observacoes}</p>}</div>
                      <div className="flex gap-2">{v.arquivo_pdf_path && <button className="rounded-xl bg-creme p-2 text-floresta" onClick={() => abrirArquivoPrivado(v.arquivo_pdf_path)}><Upload size={16}/></button>}{podeEditar && <button className="rounded-xl bg-red-50 p-2 text-red-700" onClick={() => excluirVistoria(v.id)}><Trash2 size={16}/></button>}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="card p-5">
            <div className="mb-4"><h2 className="flex items-center gap-2 text-xl font-black text-floresta"><HeartPulse size={20}/> Controle sanitário</h2><p className="text-sm text-slate-500">Exames, vacinas, vermifugação e atendimentos.</p></div>
            {podeEditar && (
              <form onSubmit={salvarControleSanitario} className="mb-5 grid gap-3 rounded-3xl bg-creme/60 p-4 md:grid-cols-2">
                <div><label className="label">Tipo</label><select className="field" value={sanitarioForm.tipo} onChange={e => setSanitarioForm({...sanitarioForm, tipo: e.target.value})}><option value="AIE">AIE</option><option value="MORMO">Mormo</option><option value="VACINA">Vacina</option><option value="VERMIFUGACAO">Vermifugação</option><option value="ATENDIMENTO">Atendimento</option><option value="OUTRO">Outro</option></select></div>
                <div><label className="label">Situação</label><select className="field" value={sanitarioForm.situacao} onChange={e => setSanitarioForm({...sanitarioForm, situacao: e.target.value})}><option value="negativo">Negativo</option><option value="positivo">Positivo</option><option value="em_dia">Em dia</option><option value="pendente">Pendente</option><option value="realizado">Realizado</option><option value="vencido">Vencido</option><option value="observacao">Observação</option></select></div>
                <div><label className="label">Data</label><input type="date" className="field" value={sanitarioForm.data_registro} onChange={e => setSanitarioForm({...sanitarioForm, data_registro: e.target.value})} /></div>
                <div><label className="label">Validade</label><input type="date" className="field" value={sanitarioForm.validade} onChange={e => setSanitarioForm({...sanitarioForm, validade: e.target.value})} /></div>
                <div><label className="label">Responsável</label><input className="field" value={sanitarioForm.responsavel} onChange={e => setSanitarioForm({...sanitarioForm, responsavel: e.target.value})} /></div>
                <div><label className="label">Descrição</label><input className="field" value={sanitarioForm.descricao} onChange={e => setSanitarioForm({...sanitarioForm, descricao: e.target.value})} placeholder="Ex: AIE laboratório X, vacina antirrábica..." /></div>
                <div className="md:col-span-2"><label className="label">Observações</label><textarea className="field" value={sanitarioForm.observacoes} onChange={e => setSanitarioForm({...sanitarioForm, observacoes: e.target.value})}></textarea></div>
                <div><label className="label">Anexo</label><input type="file" accept="application/pdf,image/*" className="field" onChange={e => setArquivoSanitario(e.target.files?.[0] || null)} /></div>
                <div className="flex items-end"><button className="btn-primary w-full" disabled={loading}><Plus size={18}/> Adicionar registro</button></div>
              </form>
            )}
            {controles.length === 0 ? <EmptyState>Nenhum registro sanitário cadastrado.</EmptyState> : (
              <div className="space-y-3">
                {controles.map((c) => (
                  <div key={c.id} className="rounded-3xl border border-slate-100 bg-white p-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div><p className="font-black text-floresta">{c.tipo} • {labelStatus(c.situacao)}</p><p className="text-sm text-slate-600">Data: {dateBR(c.data_registro)} • Validade: {dateBR(c.validade)}</p><p className="text-sm text-slate-600">Responsável: {c.responsavel || '-'}</p>{c.descricao && <p className="text-sm text-slate-700">{c.descricao}</p>}{c.observacoes && <p className="mt-2 text-sm text-slate-700">{c.observacoes}</p>}</div>
                      <div className="flex gap-2">{c.arquivo_pdf_path && <button className="rounded-xl bg-creme p-2 text-floresta" onClick={() => abrirArquivoPrivado(c.arquivo_pdf_path)}><Upload size={16}/></button>}{podeEditar && <button className="rounded-xl bg-red-50 p-2 text-red-700" onClick={() => excluirControle(c.id)}><Trash2 size={16}/></button>}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      <section className="mb-5 grid gap-3 md:grid-cols-5">
        {[
          ['AIE', form.exame_aie_validade],
          ['Mormo', form.exame_mormo_validade],
          ['Vacinas', form.vacinas_validade],
          ['Vermifugação', form.vermifugacao_validade],
          ['Próxima vistoria', form.proxima_vistoria]
        ].map(([label, data]) => (
          <div key={label} className={`rounded-2xl p-4 text-sm font-black ring-1 ${classeAlerta(data)}`}>{textoValidade(label, data)}</div>
        ))}
      </section>

      {animais.length === 0 ? <EmptyState>Nenhum animal cadastrado ainda.</EmptyState> : (
        <div className="table-wrap"><table className="table"><thead><tr><th>Animal</th><th>Responsável</th><th>RGA</th><th>Sanitário</th><th>Fotos/anexos</th><th>Ações</th></tr></thead><tbody>
          {animais.map(a => {
            const qtdFotos = CAMPOS_FOTOS.filter(([campo]) => Boolean(a[campo])).length;
            return <tr key={a.id}>
              <td><strong className="text-floresta">{a.nome_animal}</strong><br/><span className="text-xs text-slate-500">{a.especie || 'Equino'} {a.raca ? `• ${a.raca}` : ''} • {a.sexo || '-'} • {a.idade_estimada || '-'}</span><br/><span className="text-xs text-slate-500">{a.cor_pelagem || '-'} • {a.marcas_especificas || '-'}</span></td>
              <td>{a.associados?.nome_completo || '-'}<br/><span className="text-xs text-slate-500">{a.associados?.matricula || a.associados?.numero_ficha || ''}</span></td>
              <td><Badge className="bg-creme text-floresta ring-creme">{a.rga || 'Sem número'}</Badge><br/><span className="text-xs text-slate-500">{labelStatus(a.status_rga)} • {labelStatus(a.condicao_geral)}</span></td>
              <td><div className="space-y-1 text-xs"><div>{textoValidade('AIE', a.exame_aie_validade)}</div><div>{textoValidade('Mormo', a.exame_mormo_validade)}</div><div>{textoValidade('Vacinas', a.vacinas_validade)}</div><div>{textoValidade('Vistoria', a.proxima_vistoria)}</div></div></td>
              <td><span className="text-sm font-bold text-slate-700">{qtdFotos} foto(s)</span><br/>{a.ficha_rga_pdf_path || a.ficha_rga_pdf_url ? <button className="mt-2 btn-secondary" onClick={() => abrirArquivoPrivado(a.ficha_rga_pdf_path || a.ficha_rga_pdf_url)}>Abrir ficha</button> : <span className="text-xs text-slate-400">Sem ficha anexada</span>}</td>
              <td><div className="flex flex-wrap gap-2">{podeEditar && <button className="rounded-xl bg-creme p-2 text-floresta" onClick={() => editar(a)} title="Editar e abrir prontuário"><Edit3 size={16}/></button>}<button className="rounded-xl bg-green-50 p-2 text-green-700" onClick={() => abrirRgaAssinado({ ...a, associados: a.associados || {} })} title={a.ficha_rga_assinada_documento_id ? 'RGA assinado' : 'Ficha RGA'}><FileDown size={16}/></button><button className="rounded-xl bg-amber-50 p-2 text-amber-700" onClick={() => imprimirCarteirinhaAnimal({ ...a, associados: a.associados || {} }, profile)} title="Carteirinha animal"><CreditCard size={16}/></button><button className="rounded-xl bg-purple-50 p-2 text-purple-700" onClick={() => enviarRgaParaAssinatura({ ...a, associados: a.associados || {} })} title="RGA assinável"><FileSignature size={16}/></button><button className="rounded-xl bg-blue-50 p-2 text-azul" onClick={() => gerarProntuarioPorAnimal({ ...a, associados: a.associados || {} })} title="Prontuário"><QrCode size={16}/></button>{podeEditar && <button className="rounded-xl bg-red-50 p-2 text-red-700" onClick={() => excluir(a.id)}><Trash2 size={16}/></button>}</div></td>
            </tr>;
          })}
        </tbody></table></div>
      )}
    </PageShell>
  );
}
