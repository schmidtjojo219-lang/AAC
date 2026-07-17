import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle2, FileSignature, Loader2, ShieldCheck, XCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { cpfMask, dateBR, dateTimeBR } from '../lib/format';

function cpfLimpo(valor = '') {
  return String(valor || '').replace(/\D/g, '');
}

function erroSupabase(error) {
  return [error?.message, error?.details, error?.hint, error?.code].filter(Boolean).join('\n') || 'Erro desconhecido.';
}

export default function AssinarDocumento() {
  const { token } = useParams();
  const [dados, setDados] = useState(null);
  const [cpf, setCpf] = useState('');
  const [aceite, setAceite] = useState(false);
  const [loading, setLoading] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => { carregar(); }, [token]);

  async function carregar() {
    setLoading(true);
    setMsg('');
    const { data, error } = await supabase.rpc('obter_documento_para_assinatura', { p_token: token });
    if (error) setMsg('Nao foi possivel carregar o documento.\n' + erroSupabase(error));
    else if (!data) setMsg('Link de assinatura nao encontrado ou expirado.');
    else setDados(data);
    setLoading(false);
  }

  async function assinar(e) {
    e.preventDefault();
    if (!aceite) return alert('Confirme que voce leu e concorda em assinar.');
    setEnviando(true);
    setMsg('');
    const { data, error } = await supabase.rpc('assinar_documento_por_token', {
      p_token: token,
      p_cpf: cpfLimpo(cpf),
      p_aceite: aceite
    });
    if (error) setMsg('Erro ao assinar.\n' + erroSupabase(error));
    else if (data?.erro) setMsg(data.erro);
    else {
      setMsg('Documento assinado com sucesso.');
      await carregar();
    }
    setEnviando(false);
  }

  return (
    <div className="min-h-screen bg-creme px-4 py-8">
      <main className="mx-auto max-w-4xl">
        <div className="mb-6 flex items-center gap-3">
          <img src="/logo.png" alt="Logo AAC" className="h-14 w-14 rounded-2xl bg-white object-contain p-1" />
          <div>
            <p className="text-sm font-black uppercase tracking-[0.18em] text-terra">Assinatura eletronica</p>
            <h1 className="text-2xl font-black text-floresta">Associacao Amigos Carroceiros</h1>
          </div>
        </div>

        {loading && <div className="card flex items-center gap-3 p-6 font-bold text-floresta"><Loader2 className="animate-spin" /> Carregando documento...</div>}

        {msg && <div className={`mb-5 whitespace-pre-line rounded-2xl p-4 text-sm font-bold ${msg.includes('sucesso') ? 'border border-green-100 bg-green-50 text-green-700' : 'border border-amber-100 bg-amber-50 text-amber-800'}`}>{msg}</div>}

        {dados && (
          <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
            <section className="card overflow-hidden">
              <div className="border-b border-slate-100 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="badge bg-creme text-floresta">{dados.documento?.tipo_documento}</span>
                    <h2 className="mt-3 text-2xl font-black text-floresta">{dados.documento?.titulo}</h2>
                    <p className="mt-1 text-sm text-slate-500">
                      {dados.documento?.numero_documento ? `No ${dados.documento.numero_documento}/${dados.documento.ano_documento}` : 'Sem numeracao'} | {dateBR(dados.documento?.data_documento)}
                    </p>
                  </div>
                  {dados.assinante?.status === 'assinado' ? <CheckCircle2 className="text-green-600" /> : <FileSignature className="text-terra" />}
                </div>
              </div>
              <article
                className="max-w-none overflow-auto bg-slate-100 p-4"
                dangerouslySetInnerHTML={{ __html: dados.documento?.documento_original_html || dados.documento?.conteudo_html || '' }}
              />
            </section>

            <aside className="card h-fit p-5">
              <h3 className="flex items-center gap-2 text-xl font-black text-floresta"><ShieldCheck size={20}/> Conferencia</h3>
              <div className="mt-4 space-y-3 text-sm">
                <p><strong>Assinante:</strong><br />{dados.assinante?.nome}</p>
                <p><strong>Funcao:</strong><br />{dados.assinante?.cargo || '-'}</p>
                <p><strong>Status:</strong><br />{dados.assinante?.status}</p>
                {dados.assinante?.assinado_em && <p><strong>Assinado em:</strong><br />{dateTimeBR(dados.assinante.assinado_em)}</p>}
                <p className="break-all"><strong>Hash do documento:</strong><br />{dados.documento?.hash_documento || 'pendente'}</p>
                {dados.documento?.codigo_validacao && <p className="break-all"><strong>Codigo de validacao:</strong><br />{dados.documento.codigo_validacao}</p>}
              </div>

              {dados.assinante?.status === 'assinado' ? (
                <div className="mt-5 rounded-2xl border border-green-100 bg-green-50 p-4 text-sm font-bold text-green-700">
                  <CheckCircle2 className="mb-2" />
                  Este documento ja foi assinado por este link.
                </div>
              ) : (
                <form onSubmit={assinar} className="mt-5 space-y-3">
                  <label className="label">CPF para conferencia</label>
                  <input className="field" value={cpf} onChange={e => setCpf(cpfMask(e.target.value))} placeholder="000.000.000-00" />
                  <label className="flex items-start gap-2 rounded-2xl bg-creme p-3 text-sm font-bold text-slate-700">
                    <input type="checkbox" checked={aceite} onChange={e => setAceite(e.target.checked)} className="mt-1" />
                    Li o documento acima e concordo em assinar eletronicamente por este link.
                  </label>
                  <button className="btn-primary w-full" disabled={enviando}>{enviando ? <Loader2 className="animate-spin" /> : <FileSignature size={18}/>} Assinar documento</button>
                </form>
              )}

              <div className="mt-5 rounded-2xl bg-slate-50 p-3 text-xs font-semibold text-slate-500">
                A assinatura registra aceite, data, hora, hash do documento e token de acesso. Esta nao substitui certificado digital ICP-Brasil quando a lei exigir esse formato.
              </div>
            </aside>
          </div>
        )}

        {!loading && !dados && !msg && (
          <div className="card p-6 text-center">
            <XCircle className="mx-auto text-red-600" />
            <p className="mt-3 font-bold text-slate-700">Documento nao localizado.</p>
          </div>
        )}
      </main>
    </div>
  );
}
