import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { BadgeCheck, FileSearch, Search, ShieldCheck, XCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { dateBR } from '../lib/format';

function formatarDataHora(valor) {
  if (!valor) return '-';
  const d = new Date(valor);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleString('pt-BR');
}

export default function ValidarDocumento() {
  const { codigo = '' } = useParams();
  const [busca, setBusca] = useState(codigo || '');
  const [resultado, setResultado] = useState(null);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');

  useEffect(() => {
    if (codigo) consultar(codigo);
  }, [codigo]);

  async function consultar(valor = busca) {
    const termo = String(valor || '').trim();
    if (!termo) return;
    setLoading(true);
    setErro('');
    setResultado(null);

    const { data, error } = await supabase
      .from('consulta_publica_documentos')
      .select('*')
      .eq('codigo_validacao', termo)
      .maybeSingle();

    if (error) {
      setErro('Não foi possível consultar o documento. Verifique se o SQL da v6.4 foi executado no Supabase.');
    } else if (!data) {
      setErro('Documento não encontrado ou código inválido. Confira se digitou o código exatamente como aparece no PDF.');
    } else {
      setResultado(data);
    }
    setLoading(false);
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-creme via-white to-green-50 px-4 py-10">
      <div className="mx-auto max-w-3xl">
        <Link to="/consulta" className="mb-6 inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-2 text-sm font-black text-floresta shadow-sm ring-1 ring-slate-100">← Voltar para consulta pública</Link>
        <section className="overflow-hidden rounded-[2rem] bg-white shadow-premium ring-1 ring-slate-100">
          <div className="bg-gradient-to-r from-floresta to-azul p-7 text-white">
            <div className="flex items-center gap-4">
              <img src="/logo.png" alt="Logo AAC" className="h-16 w-16 rounded-2xl bg-white object-contain p-2" />
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.25em] text-white/70">Validação pública</p>
                <h1 className="text-2xl font-black md:text-3xl">Documento emitido pela AAC</h1>
                <p className="mt-1 text-white/80">Confira a autenticidade básica de certidões, atas, recibos e documentos gerados pelo painel.</p>
              </div>
            </div>
          </div>

          <div className="p-6 md:p-8">
            <div className="flex flex-col gap-3 md:flex-row">
              <input className="field flex-1" value={busca} onChange={e => setBusca(e.target.value)} placeholder="Ex.: AAC-CERT-AAC-0001-2026-AB12CD34" />
              <button className="btn-primary" disabled={loading} onClick={() => consultar()}><Search size={18}/> {loading ? 'Consultando...' : 'Validar'}</button>
            </div>

            {erro && <div className="mt-6 rounded-3xl border border-red-100 bg-red-50 p-5 font-bold text-red-700"><XCircle className="mb-2"/> {erro}</div>}

            {resultado && (
              <div className="mt-7 rounded-3xl border border-green-100 bg-green-50 p-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-green-700 px-4 py-2 text-sm font-black text-white"><ShieldCheck size={17}/> Documento válido</div>
                    <h2 className="text-2xl font-black text-floresta">{resultado.titulo}</h2>
                    <p className="mt-1 text-slate-600">Tipo: <strong>{resultado.tipo_documento}</strong></p>
                  </div>
                  <BadgeCheck className="h-14 w-14 text-green-700" />
                </div>

                <div className="mt-6 grid gap-3 md:grid-cols-2">
                  <Info label="Código de validação" value={resultado.codigo_validacao} />
                  <Info label="Referência" value={resultado.codigo_referencia || '-'} />
                  <Info label="Emitido em" value={formatarDataHora(resultado.emitido_em)} />
                  <Info label="Emitido por" value={resultado.emitido_por_nome || 'Associação Amigos Carroceiros - AAC'} />
                  <Info label="Status" value={resultado.status === 'valido' ? 'Válido' : resultado.status} />
                  <Info label="Associado/animal relacionado" value={resultado.dados_publicos?.nome || resultado.dados_publicos?.associado || resultado.dados_publicos?.animal || '-'} />
                </div>

                <p className="mt-6 rounded-2xl bg-white p-4 text-sm font-semibold text-slate-600 ring-1 ring-green-100">
                  Esta validação confirma que há registro interno do documento no sistema da AAC. Ela não substitui reconhecimento de firma, autenticação cartorial ou certificado digital ICP-Brasil.
                </p>
              </div>
            )}

            {!resultado && !erro && <div className="mt-8 rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-slate-500"><FileSearch className="mx-auto mb-3"/> Digite o código de validação impresso no documento ou escaneie o QR Code.</div>}
          </div>
        </section>
      </div>
    </main>
  );
}

function Info({ label, value }) {
  return <div className="rounded-2xl bg-white p-4 ring-1 ring-green-100"><p className="text-xs font-black uppercase tracking-wider text-terra">{label}</p><p className="mt-1 break-words font-bold text-floresta">{value || '-'}</p></div>;
}
