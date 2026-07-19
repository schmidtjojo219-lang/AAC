import { create } from "zustand";
const PADRAO = {
  DIRETOR_PRESIDENTE: ["saldo-geral","fluxo-financeiro","processos-pendentes","ultimas-atividades","agenda"],
  DIRETOR_VICE:       ["saldo-geral","fluxo-financeiro","ultimas-atividades","agenda"],
  SECRETARIO:         ["novos-associados","proximos-eventos","documentos-assinar","processos"],
  TESOUREIRO:         ["caixa","bancos","mensalidades-atraso","receitas-mes","despesas-mes"],
  CONSELHO_FISCAL:    ["prestacoes","receitas-mes","despesas-mes"],
  ASSOCIADO:          ["minhas-mensalidades","meus-animais","meus-documentos","agenda"],
  PUBLICO:            [],
};

export const useWorkspace = create((set, get) => ({
  cards: [],
  carregarPadrao: (perfilChave) => set({ cards: PADRAO[perfilChave] || PADRAO.ASSOCIADO }),
  reorganizar: (novaOrdem) => set({ cards: novaOrdem }),
  adicionarCard: (card) => set({ cards: [...get().cards, card] }),
  removerCard: (card) => set({ cards: get().cards.filter(c => c !== card) }),
}));