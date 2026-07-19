import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { LayoutPrincipal } from "./ui/layouts/LayoutPrincipal";
import { RotaProtegida } from "./core/auth/RotaProtegida";
import { useAuthStore } from "./core/auth/authStore";
import { useEffect } from "react";

import LoginPage from "./modules/01-mesa-administrativa/pages/LoginPage";
import MesaAdministrativaPage from "./modules/01-mesa-administrativa/pages/MesaAdministrativaPage";
import ListaPessoasPage from "./modules/02-central-pessoas/pages/ListaPessoasPage";
import ProntuarioPage from "./modules/02-central-pessoas/pages/prontuario/ProntuarioPage";
import ListaAnimaisPage from "./modules/03-central-animal/pages/ListaAnimaisPage";
import ProntuarioAnimalPage from "./modules/03-central-animal/pages/prontuario-veterinario/ProntuarioAnimalPage";

const Placeholder = ({ titulo, descricao }) => (
  <div>
    <h1 className="titulo-pagina">{titulo}</h1>
    <p className="subtitulo-pagina">{descricao} — Será entregue na próxima fase.</p>
    <div className="card-oficial p-12 text-center text-institucional-textoSecundario">
      <p className="text-5xl mb-3">🚧</p>
      <p className="font-semibold">Módulo em desenvolvimento</p>
    </div>
  </div>
);

export default function App() {
  const { autenticado, carregarSessao } = useAuthStore();
  useEffect(() => { carregarSessao(); }, [carregarSessao]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={autenticado ? <Navigate to="/" replace /> : <LoginPage />} />
        <Route path="/403" element={<div className="p-20 text-center"><h1 className="text-4xl font-bold text-red-600">403</h1><p>Acesso proibido</p></div>} />

        <Route element={<RotaProtegida><LayoutPrincipal /></RotaProtegida>}>
          <Route index element={<MesaAdministrativaPage />} />

          <Route path="pessoas" element={<ListaPessoasPage />} />
          <Route path="pessoas/:id" element={<ProntuarioPage />} />

          <Route path="animais" element={<ListaAnimaisPage />} />
          <Route path="animais/:id" element={<ProntuarioAnimalPage />} />

          <Route path="financeiro/*" element={<Placeholder titulo="💰 Central Financeira" descricao="Caixa, Asaas, Fundos, Planejamento e Prestação de Contas" />} />
          <Route path="documentos/*" element={<Placeholder titulo="📄 Central Documental" descricao="Editor, Modelos, Mesa de Assinaturas, Hash e QR" />} />
          <Route path="processos/*" element={<Placeholder titulo="📂 Central de Processos" descricao="Fluxo SIPAC" />} />
          <Route path="estatisticas/*" element={<Placeholder titulo="📊 Inteligência e Estatísticas" descricao="Painéis completos" />} />
          <Route path="portal/*" element={<Placeholder titulo="🌐 Portal Institucional" descricao="Consulta pública e validação" />} />
          <Route path="admin/*" element={<Placeholder titulo="⚙️ Administração" descricao="Usuários, permissões, logs" />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}