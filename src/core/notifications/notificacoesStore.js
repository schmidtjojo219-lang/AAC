import { create } from "zustand";

export const useNotificacoes = create((set, get) => ({
  lista: [],
  naoLidas: 0,

  adicionar: ({ titulo, mensagem, modulo = "SISTEMA", tipo = "info", link = null }) => {
    const nova = {
      id: crypto.randomUUID(),
      dataHora: new Date().toISOString(),
      lida: false,
      titulo, mensagem, modulo, tipo, link
    };
    const lista = [nova, ...get().lista];
    set({ lista, naoLidas: lista.filter(n => !n.lida).length });
  },

  marcarLida: (id) => {
    const lista = get().lista.map(n => n.id === id ? { ...n, lida: true } : n);
    set({ lista, naoLidas: lista.filter(n => !n.lida).length });
  },

  marcarTodas: () => {
    const lista = get().lista.map(n => ({ ...n, lida: true }));
    set({ lista, naoLidas: 0 });
  }
}));
