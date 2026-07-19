import { create } from "zustand";
const lerLS = (c, p) => { try { const r = localStorage.getItem(c); return r ? JSON.parse(r) : p; } catch { return p; } };
const salvarLS = (c, v) => { try { localStorage.setItem(c, JSON.stringify(v)); } catch {} };

export const useNotificacoes = create((set, get) => ({
  lista: lerLS("aac_notificacoes", []),
  naoLidas: lerLS("aac_notificacoes", []).filter(n => !n.lida).length,

  _persistir: (lista) => { salvarLS("aac_notificacoes", lista.slice(0, 500)); },

  adicionar: ({ titulo, mensagem, modulo = "SISTEMA", tipo = "info", link = null }) => {
    const nova = { id: crypto.randomUUID(), dataHora: new Date().toISOString(), lida: false, titulo, mensagem, modulo, tipo, link };
    const lista = [nova, ...get().lista].slice(0, 500);
    get()._persistir(lista);
    set({ lista, naoLidas: lista.filter(n => !n.lida).length });
  },

  marcarLida: (id) => {
    const lista = get().lista.map(n => n.id === id ? { ...n, lida: true } : n);
    get()._persistir(lista);
    set({ lista, naoLidas: lista.filter(n => !n.lida).length });
  },

  marcarTodas: () => {
    const lista = get().lista.map(n => ({ ...n, lida: true }));
    get()._persistir(lista);
    set({ lista, naoLidas: 0 });
  }
}));