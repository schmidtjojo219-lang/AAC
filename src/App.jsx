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

import FinanceiroPage from "./modules/04-central-financeira/FinanceiroPage";
import MensalidadesPage from "./modules/04-central-financeira/mensalidades/MensalidadesPage";
import FundosPage from "./modules/04-central-financeira/fundos/FundosPage";
import PrestacaoPage from "./modules/04-central-financeira/prestacao-contas/PrestacaoPage";
import PlanejamentoPage from "./modules/04-central-financeira/planejamento/PlanejamentoPage";
import ModuloGenerico from "./modules/04-central-financeira/_ModuloGenerico";

const Placeholder = ({ titulo, descricao }) => (
  <div>
    <h1 className="titulo-pagina">{titulo}</h1>
    <p className="subtitulo-pagina">{descricao} — Será entregue na próxima fase.</p>
    <div className="card-oficial p-12 text-center text-institucional-textoSecundario">
      <p className="text-5xl mb-3">🚧</p><p className="font-semibold">Módulo em desenvolvimento</p>
    </div>
  </div>
);

export default function App() {
  const carregarSessao = useAuthStore(s => s.carregarSessao);
  // 🔴 Carrega sessão UMA VEZ no boot — ANTES das rotas decidirem algo
  useEffect(() => { carregarSessao(); }, [carregarSessao]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/403" element={<div className="p-20 text-center"><h1 className="text-4xl font-bold text-red-600">403</h1><p>Acesso proibido</p></div>} />

        <Route element={<RotaProtegida><LayoutPrincipal /></RotaProtegida>}>
          <Route index element={<MesaAdministrativaPage />} />

          <Route path="pessoas" element={<ListaPessoasPage />} />
          <Route path="pessoas/:id" element={<ProntuarioPage />} />

          <Route path="animais" element={<ListaAnimaisPage />} />
          <Route path="animais/:id" element={<ProntuarioAnimalPage />} />

          <Route path="financeiro" element={<FinanceiroPage />} />
          <Route path="financeiro/mensalidades" element={<MensalidadesPage />} />
          <Route path="financeiro/fundos" element={<FundosPage />} />
          <Route path="financeiro/prestacao" element={<PrestacaoPage />} />
          <Route path="financeiro/planejamento" element={<PlanejamentoPage />} />
          <Route path="financeiro/caixa" element={<ModuloGenerico titulo="💵 Caixa" descricao="Controle diário de entradas e saídas em espécie" />} />
          <Route path="financeiro/bancos" element={<ModuloGenerico titulo="🏦 Bancos" descricao="Contas bancárias, extratos e saldos" />} />
          <Route path="financeiro/receitas" element={<ModuloGenerico titulo="📥 Receitas" descricao="Todas as entradas, integração Asaas" />} />
          <Route path="financeiro/despesas" element={<ModuloGenerico titulo="📤 Despesas" descricao="Pagamentos, fornecedores, centro de custos" />} />
          <Route path="financeiro/fluxo" element={<ModuloGenerico titulo="🌊 Fluxo de Caixa" descricao="Projeção diária de entradas e saídas" />} />
          <Route path="financeiro/custos" element={<ModuloGenerico titulo="🏷️ Centro de Custos" descricao="Classificação orçamentária" />} />
          <Route path="financeiro/conciliacao" element={<ModuloGenerico titulo="🔗 Conciliação Bancária" descricao="Importação OFX e conferência automática" />} />

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