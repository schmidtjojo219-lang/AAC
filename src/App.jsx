import { BrowserRouter, Routes, Route } from "react-router-dom";
import { LayoutPrincipal } from "./ui/layouts/LayoutPrincipal";
import { RotaProtegida } from "./core/auth/RotaProtegida";
import { useAuthStore } from "./core/auth/authStore";
import { useEffect } from "react";

// Páginas placeholder (serão substituídas nas próximas fases)
const Placeholder = ({ titulo, descricao }) => (
  <div>
    <h1 className="titulo-pagina">{titulo}</h1>
    <p className="subtitulo-pagina">{descricao} — Em construção na próxima fase.</p>
    <div className="card-oficial p-12 text-center text-institucional-textoSecundario">
      <p className="text-5xl mb-3">🚧</p>
      <p className="font-semibold">Módulo em desenvolvimento</p>
      <p className="text-sm mt-1">Este módulo será entregue completo nas próximas etapas da v8.0</p>
    </div>
  </div>
);

export default function App() {
  const carregarSessao = useAuthStore(s => s.carregarSessao);
  useEffect(() => { carregarSessao(); }, [carregarSessao]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Placeholder titulo="Login" descricao="Tela de acesso ao sistema" />} />
        <Route path="/403" element={<div className="p-20 text-center"><h1 className="text-4xl font-bold text-red-600">403</h1><p>Acesso proibido</p></div>} />

        {/* ROTAS PROTEGIDAS DENTRO DO LAYOUT OFICIAL */}
        <Route element={<RotaProtegida><LayoutPrincipal /></RotaProtegida>}>
          <Route index element={<Placeholder titulo="🏛️  Mesa Administrativa" descricao="Painel inicial com todos os indicadores institucionais" />} />
          <Route path="pessoas/*" element={<Placeholder titulo="👥 Central de Pessoas" descricao="Prontuário Institucional dos associados" />} />
          <Route path="animais/*" element={<Placeholder titulo="🐎 Central Animal" descricao="Prontuário Veterinário completo" />} />
          <Route path="financeiro/*" element={<Placeholder titulo="💰 Central Financeira" descricao="Caixa, bancos, fundos, Asaas, planejamento e prestação de contas" />} />
          <Route path="documentos/*" element={<Placeholder titulo="📄 Central Documental" descricao="Editor, modelos, mesa de assinaturas, hash e QR" />} />
          <Route path="processos/*" element={<Placeholder titulo="📂 Central de Processos" descricao="Fluxo processual estilo SIPAC" />} />
          <Route path="estatisticas/*" element={<Placeholder titulo="📊 Inteligência e Estatísticas" descricao="Painéis, gráficos e indicadores" />} />
          <Route path="portal/*" element={<Placeholder titulo="🌐 Portal Institucional" descricao="Consulta pública e validação de documentos" />} />
          <Route path="admin/*" element={<Placeholder titulo="⚙️ Administração" descricao="Usuários, permissões, configurações e logs" />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
