import { create } from "zustand";
export const useBuscaGlobal = create((set) => ({
  termo: "", resultados: [], aberto: false,
  pesquisar: (termo) => {
    set({ termo });
    if (!termo || termo.length < 2) { set({ resultados: [] }); return; }
    set({ resultados: [] });
  },
  abrir: () => set({ aberto: true }),
  fechar: () => set({ aberto: false, termo: "", resultados: [] }),
}));