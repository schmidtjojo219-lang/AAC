import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, Home, PawPrint, Search, ShieldCheck, Users } from 'lucide-react';
import { supabase, supabaseConfigured } from '../lib/supabase';
import { dateBR } from '../lib/format';

const STATUS_ASSOCIADO = {
  aprovado: 'Ativo',
  inativo: 'Inativo',
  pendente: 'Pendente',
  reprovado: 'Reprovado'
};

const STATUS_RGA = {
  ativo: 'Ativo',
  suspenso: 'Suspenso',
  inativo: 'Inativo',
  pendente: 'Pendente'
};

const CONDICOES = {
  apto: 'Apto',
  inapto: 'Inapto',
  em_dia: 'Em dia',
  pendente: 'Pendente',
  bom: 'Bom',
  ruim: 'Ruim',
  negativo: 'Negativo',
  positivo: 'Positivo'
};

function normalizarTipo(tipo) {
  return tipo === 'rga' ? 'rga' : tipo === 'associado' ? 'associado' : 'associado';
}

function statusClass(valor) {
  const texto = String(valor || '').toLowerCase();
  if (texto.includes('ativo') || texto.includes('regular') || texto.includes('apto') || texto.includes('negativo') || texto.includes('em dia')) {
    return 'bg-green-50 text-green-700 ring-green-100';
  }
  if (texto.includes('suspenso') || texto.includes('pend') || texto.includes('inapto') || texto.includes('positivo')) {
    return 'bg-amber-50 text-amber-700 ring-amber-100';
  }
  if (texto.includes('inativo') || texto.includes('cancelado') || texto.includes('reprovado')) {
    return 'bg-red-50 text-red-700 ring-red-100';
  }
  return 'bg-slate-50 text-slate-700 ring-slate-100';
}

function Linha({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white/80 p-4">
      <p className="text-xs font-black uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-1 break-words text-base font-black text-slate-800">{value || 'Não informado'}</p>
    </div>
  );
}

function Selo({ children }) {
  return <span className={`inline-flex rounded-full px-4 py-2 text-sm font-black ring-1 ${statusClass(children)}`}>{children}</span>;
}

function ResultadoAssociado({ dados }) {
  const situacao = dados.situacao_publica || STATUS_ASSOCIADO[dados.status] || dados.status || 'Não informado';
  const financeiro = dados.status_financeiro || 'Não informado';

  return (
    <section className="card overflow-hidden">
      <div className="bg-floresta p-6 text-white">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.25em] text-dourado">Consulta pública</p>
            <h2 className="mt-2 text-3xl font-black">Associado AAC</h2>
          </div>
          <Users className="h-12 w-12 text-dourado" />
        </div>
      </div>

      <div className="p-6">
        <div className="mb-5 flex flex-wrap gap-3">
          <Selo>{situacao}</Selo>
          <Selo>Financeiro: {financeiro}</Selo>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Linha label="Nome" value={dados.nome_completo} />
          <Linha label="Matrícula / Nº da ficha" value={dados.matricula || dados.numero_ficha || dados.codigo} />
          <Linha label="Categoria" value={dados.tipo_cadastro} />
          <Linha label="Data de admissão" value={dateBR(dados.data_admissao)} />
        </div>

        <div className="mt-5 rounded-2xl border border-dourado/20 bg-dourado/10 p-4 text-sm text-slate-700">
          Esta consulta confirma apenas informações públicas de vínculo institucional. CPF, endereço, telefone, e-mail e documentos assinados não são exibidos por segurança.
        </div>
      </div>
    </section>
  );
}

function ResultadoRga({ dados }) {
  const situacao = STATUS_RGA[dados.status_rga] || dados.status_rga || 'Não informado';
  const condicao = CONDICOES[dados.condicao_geral] || CONDICOES[dados.estado_fisico_status] || dados.condicao_geral || dados.estado_fisico_status || 'Não informado';

  return (
    <section className="card overflow-hidden">
      <div className="bg-floresta p-6 text-white">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.25em] text-dourado">Consulta pública</p>
            <h2 className="mt-2 text-3xl font-black">Registro Geral Animal</h2>
          </div>
          <PawPrint className="h-12 w-12 text-dourado" />
        </div>
      </div>

      <div className="p-6">
        <div className="mb-5 flex flex-wrap gap-3">
          <Selo>RGA: {situacao}</Selo>
          <Selo>Condição: {condicao}</Selo>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Linha label="Número RGA" value={dados.rga || dados.codigo} />
          <Linha label="Nome do animal" value={dados.nome_animal} />
          <Linha label="Espécie" value={dados.especie || 'Equino'} />
          <Linha label="Raça" value={dados.raca} />
          <Linha label="Sexo" value={dados.sexo} />
          <Linha label="Pelagem" value={dados.pelagem || dados.cor_pelagem} />
          <Linha label="Idade aproximada" value={dados.idade_estimada} />
          <Linha label="Proprietário" value={dados.proprietario_nome} />
          <Linha label="Matrícula do proprietário" value={dados.proprietario_matricula} />
          <Linha label="Última vistoria/atualização" value={dateBR(dados.data_vistoria || dados.updated_at)} />
          <Linha label="Próxima vistoria" value={dateBR(dados.proxima_vistoria)} />
          <Linha label="Vacinas" value={CONDICOES[dados.vacinas_status] || dados.vacinas_status} />
          <Linha label="Validade das vacinas" value={dateBR(dados.vacinas_validade)} />
          <Linha label="Exame AIE" value={CONDICOES[dados.exame_aie_status] || dados.exame_aie_status} />
          <Linha label="Validade AIE" value={dateBR(dados.exame_aie_validade)} />
          <Linha label="Exame Mormo" value={CONDICOES[dados.exame_mormo_status] || dados.exame_mormo_status} />
          <Linha label="Validade Mormo" value={dateBR(dados.exame_mormo_validade)} />
          <Linha label="Cascos/Ferraduras" value={CONDICOES[dados.cascos_status] || dados.cascos_status} />
        </div>

        <div className="mt-5 rounded-2xl border border-dourado/20 bg-dourado/10 p-4 text-sm text-slate-700">
          Esta consulta não substitui vistoria veterinária, laudo técnico ou documento físico assinado pela AAC. Dados pessoais completos do associado não são exibidos publicamente.
        </div>
      </div>
    </section>
  );
}

export default function ConsultaPublica() {
  const params = useParams();
  const navigate = useNavigate();
  const tipoInicial = normalizarTipo(params.tipo);
  const [tipo, setTipo] = useState(tipoInicial);
  const [codigoBusca, setCodigoBusca] = useState(params.codigo || '');
  const [dados, setDados] = useState(null);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');

  const subtitulo = useMemo(() => {
    if (!params.codigo) return 'Digite uma matrícula de associado ou número de RGA para consultar.';
    return tipoInicial === 'rga' ? 'Resultado da consulta pública de RGA.' : 'Resultado da consulta pública de associado.';
  }, [params.codigo, tipoInicial]);

  useEffect(() => {
    async function carregar() {
      if (!params.codigo || !supabaseConfigured) return;
      setLoading(true);
      setErro('');
      setDados(null);

      const tabela = tipoInicial === 'rga' ? 'consulta_publica_rga' : 'consulta_publica_associados';
      const codigo = decodeURIComponent(params.codigo).trim();
      const { data, error } = await supabase
        .from(tabela)
        .select('*')
        .eq('codigo_normalizado', codigo.toLowerCase())
        .maybeSingle();

      if (error) {
        setErro('Não foi possível consultar agora. Verifique se a atualização v3.sql foi executada no Supabase.');
      } else if (!data) {
        setErro('Registro não encontrado ou ainda não liberado para consulta pública.');
      } else {
        setDados(data);
      }
      setLoading(false);
    }

    carregar();
  }, [params.codigo, tipoInicial]);

  function pesquisar(event) {
    event.preventDefault();
    const codigo = codigoBusca.trim();
    if (!codigo) return;
    navigate(`/consulta/${tipo}/${encodeURIComponent(codigo)}`);
  }

  return (
    <main className="min-h-screen px-4 py-8 md:py-12">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8 flex flex-col gap-5 rounded-[2rem] border border-white/70 bg-white/85 p-6 shadow-premium backdrop-blur md:flex-row md:items-center md:justify-between">
          <Link to="/consulta" className="flex items-center gap-4">
            <img src="/logo.png" alt="Logo AAC" className="h-16 w-16 rounded-2xl object-contain" />
            <div>
              <p className="text-sm font-black uppercase tracking-[0.25em] text-terra">Associação Amigos Carroceiros</p>
              <h1 className="text-3xl font-black text-floresta">Consulta Pública AAC</h1>
              <p className="mt-1 text-sm text-slate-600">{subtitulo}</p>
            </div>
          </Link>

          <Link to="/login" className="btn-secondary"><Home size={18} /> Área interna</Link>
        </header>

        <section className="card mb-8 p-5">
          <form onSubmit={pesquisar} className="grid gap-4 md:grid-cols-[220px_1fr_auto] md:items-end">
            <div>
              <label className="label" htmlFor="tipo-consulta">Tipo de consulta</label>
              <select id="tipo-consulta" className="field" value={tipo} onChange={(e) => setTipo(e.target.value)}>
                <option value="associado">Associado</option>
                <option value="rga">Animal / RGA</option>
              </select>
            </div>
            <div>
              <label className="label" htmlFor="codigo-consulta">Código</label>
              <input
                id="codigo-consulta"
                className="field"
                value={codigoBusca}
                onChange={(e) => setCodigoBusca(e.target.value)}
                placeholder={tipo === 'rga' ? 'Ex: AAC-RGA-002' : 'Ex: AAC-001'}
              />
            </div>
            <button type="submit" className="btn-primary"><Search size={18} /> Consultar</button>
          </form>
        </section>

        {!supabaseConfigured && (
          <div className="rounded-3xl border border-amber-100 bg-amber-50 p-5 text-amber-800">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-1" />
              <div>
                <p className="font-black">Supabase não configurado</p>
                <p className="text-sm">Preencha o arquivo .env com VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.</p>
              </div>
            </div>
          </div>
        )}

        {loading && <div className="card p-8 text-center text-lg font-black text-floresta">Consultando registro...</div>}

        {erro && !loading && (
          <div className="rounded-3xl border border-red-100 bg-red-50 p-6 text-red-800">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-1" />
              <div>
                <p className="font-black">Consulta não localizada</p>
                <p className="text-sm">{erro}</p>
              </div>
            </div>
          </div>
        )}

        {dados && !loading && (
          tipoInicial === 'rga' ? <ResultadoRga dados={dados} /> : <ResultadoAssociado dados={dados} />
        )}

        {!params.codigo && !loading && !erro && (
          <div className="grid gap-6 md:grid-cols-2">
            <div className="card p-6">
              <CheckCircle2 className="h-10 w-10 text-floresta" />
              <h2 className="mt-4 text-xl font-black text-floresta">Validação institucional</h2>
              <p className="mt-2 text-slate-600">A página confirma dados públicos de associado e RGA a partir do QR Code emitido pelo painel interno da AAC.</p>
            </div>
            <div className="card p-6">
              <ShieldCheck className="h-10 w-10 text-floresta" />
              <h2 className="mt-4 text-xl font-black text-floresta">Proteção de dados</h2>
              <p className="mt-2 text-slate-600">CPF, endereço, telefone, e-mail pessoal e anexos não aparecem nessa consulta pública.</p>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
