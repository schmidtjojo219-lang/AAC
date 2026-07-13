import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase, supabaseConfigured } from '../lib/supabase';

export default function Login({ session }) {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  if (session) return <Navigate to="/" replace />;

  async function entrar(e) {
    e.preventDefault();
    setMsg('');
    setLoading(true);

    if (!supabaseConfigured) {
      setMsg('Configure o arquivo .env com VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY antes de entrar.');
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password: senha });

    if (error) {
      setMsg('Não foi possível entrar. Confira e-mail, senha e se o usuário já foi criado no Supabase.');
    }

    setLoading(false);
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-[2rem] bg-white shadow-premium lg:grid-cols-2">
        <div className="bg-gradient-to-br from-floresta via-floresta2 to-azul p-8 text-white lg:p-12">
          <img src="/logo.png" alt="Logo AAC" className="h-24 w-24 rounded-3xl bg-white/95 object-contain p-2" />
          <p className="mt-8 text-sm font-black uppercase tracking-[0.22em] text-ouro">Sistema interno</p>
          <h1 className="mt-3 text-4xl font-black leading-tight lg:text-5xl">Painel da Associação Amigos Carroceiros</h1>
          <p className="mt-5 max-w-md text-lg text-white/80">Área protegida para Diretoria Executiva, Tesouraria, Bem-Estar Animal e Conselho Fiscal.</p>
          <div className="mt-8 rounded-3xl border border-white/20 bg-white/10 p-5 text-sm text-white/80">
            Use apenas contas autorizadas. As ações internas devem respeitar o Estatuto, a transparência e a proteção dos dados dos associados.
          </div>
        </div>

        <form onSubmit={entrar} className="p-8 lg:p-12">
          <p className="text-sm font-black uppercase tracking-[0.2em] text-terra">Entrar</p>
          <h2 className="mt-2 text-3xl font-black text-floresta">Acesso ao painel</h2>
          <p className="mt-2 text-slate-500">Informe seu e-mail institucional e senha.</p>

          {!supabaseConfigured && (
            <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800">
              Supabase ainda não configurado. Veja o README e preencha o arquivo <code>.env</code>.
            </div>
          )}

          <div className="mt-8 space-y-5">
            <div>
              <label className="label" htmlFor="email">E-mail</label>
              <input className="field" id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="contato@amigoscarroceiros.org.br" required />
            </div>
            <div>
              <label className="label" htmlFor="senha">Senha</label>
              <input className="field" id="senha" type="password" value={senha} onChange={(e) => setSenha(e.target.value)} placeholder="Sua senha" required />
            </div>
          </div>

          {msg && <div className="mt-5 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-bold text-red-700">{msg}</div>}

          <button className="btn-primary mt-7 w-full" disabled={loading}>{loading ? 'Entrando...' : 'Entrar no painel'}</button>
        </form>
      </div>
    </div>
  );
}
