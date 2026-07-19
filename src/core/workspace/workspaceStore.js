import { create } from "zustand";

// WORKSPACE PERSONALIZÁVEL — Cada usuário organiza seus cards
const PADRAO = {
  DIRETOR_PRESIDENTE: ["saldo-geral", "fluxo-financeiro", "processos-pendentes", "ultimas-atividades", "agenda"],
  TESOUREIRO: ["caixa", "bancos", "mensalidades-atraso", "receitas-mes", "despesas-mes"],
  SECRETARIO: ["novos-associados", "proximos-eventos", "documentos-assinar", "processos"],
  ASSOCIADO: ["minhas-mensalidades", "meus-animais", "meus-documentos", "agenda"],
};

export const useWorkspace = create((set, get) => ({
  cards: [],

  carregarPadrao: (perfil) => {
    set({ cards: PADRAO[perfil] || PADRAO.ASSOCIADO });
  },

  reorganizar: (novaOrdem) => set({ cards: novaOrdem }),
  adicionarCard: (card) => set({ cards: [...get().cards, card] }),
  removerCard: (card) => set({ cards: get().cards.filter(c => c !== card) }),
}));
