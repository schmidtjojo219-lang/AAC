import { create } from "zustand";

// BUSCA GLOBAL UNIFICADA — Pesquisa em TODOS os módulos
export const useBuscaGlobal = create((set) => ({
  termo: "",
  resultados: [],
  aberto: false,

  pesquisar: (termo) => {
    set({ termo });
    if (!termo || termo.length < 2) { set({ resultados: [] }); return; }
    const t = termo.toLowerCase();
    const resultados = [];

    // Buscas futuras — cada módulo se registra aqui
    // pessoas: ...
    // animais: ...
    // documentos: ...

    set({ resultados });
  },
  abrir: () => set({ aberto: true }),
  fechar: () => set({ aberto: false, termo: "", resultados: [] }),
}));
