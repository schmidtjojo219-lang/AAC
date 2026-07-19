import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../../core/auth/authStore";
import { Botao } from "../../../ui/components/buttons/Botao";
import { Input } from "../../../ui/components/forms/Input";
import { Badge } from "../../../ui/components/cards/Badge";

const USUARIOS_DEMO = [
  { id: 1, nome: "Presidente da AAC", email: "dp@aac.org.br", senha: "123456", perfil: "DIRETOR_PRESIDENTE" },
  { id: 3, nome: "Secretário Geral", email: "sec@aac.org.br", senha: "123456", perfil: "SECRETARIO" },
  { id: 4, nome: "Tesoureiro", email: "tes@aac.org.br", senha: "123456", perfil: "TESOUREIRO" },
  { id: 6, nome: "Associado Demo", email: "assoc@aac.org.br", senha: "123456", perfil: "ASSOCIADO" },
];

export default function LoginPage() {
  const [email, setEmail] = useState("dp@aac.org.br");
  const [senha, setSenha] = useState("123456");
  const [erro, setErro] = useState("");
  const login = useAuthStore(s => s.login);
  const nav = useNavigate();

  const entrar = (e) => {
    e.preventDefault();
    const u = USUARIOS_DEMO.find(x => x.email === email && x.senha === senha);
    if (!u) { setErro("E-mail ou senha incorretos"); return; }
    login(u);
    nav("/");
  };

  const logarComo = (u) => { login(u); nav("/"); };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="hidden lg:flex bg-gov-500 text-white flex-col justify-between p-12">
        <div>
          <h1 className="text-4xl font-bold mb-3">AAC v8.0</h1>
          <p className="text-gov-100 text-lg">Sistema Integrado de Gestão Institucional</p>
          <p className="text-gov-200 text-sm mt-2">Associação Amigos Carroceiros</p>
        </div>
        <div className="space-y-3 text-sm text-gov-100">
          <p>🏛️ 9 Centrais de Gestão</p>
          <p>🔐 Auditoria universal com SHA-256</p>
          <p>📄 Documentos oficiais com validação pública</p>
          <p>💰 Integração financeira completa</p>
        </div>
      </div>

      <div className="flex items-center justify-center p-6 bg-institucional-fundo">
        <div className="w-full max-w-md">
          <div className="card-oficial p-8">
            <h2 className="text-2xl font-bold text-gov-700 mb-1">Acessar o sistema</h2>
            <p className="text-sm text-institucional-textoSecundario mb-6">Informe suas credenciais para entrar</p>

            <form onSubmit={entrar} className="space-y-4">
              <Input label="E-mail" value={email} onChange={e => setEmail(e.target.value)} />
              <Input label="Senha" type="password" value={senha} onChange={e => setSenha(e.target.value)} />
              {erro && <p className="text-xs text-red-600">{erro}</p>}
              <Botao tipo="submit" className="w-full" variante="primario">Entrar</Botao>
            </form>

            <div className="mt-8 pt-6 border-t border-institucional-borda">
              <p className="text-xs text-institucional-textoSecundario mb-3 uppercase tracking-wide font-semibold">Acesso rápido DEMO:</p>
              <div className="grid grid-cols-2 gap-2">
                {USUARIOS_DEMO.map(u => (
                  <button key={u.id} onClick={() => logarComo(u)}
                    className="text-left p-2.5 rounded-md border border-institucional-borda hover:bg-gov-50 hover:border-gov-300 transition text-xs">
                    <div className="font-semibold text-institucional-texto">{u.nome}</div>
                    <div className="flex items-center gap-1 mt-0.5"><Badge cor="info">{u.perfil.replace(/_/g," ")}</Badge></div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}