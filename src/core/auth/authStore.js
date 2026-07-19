import { create } from "zustand";
import { PERFIS } from "./perfis";

export const useAuthStore = create((set, get) => ({
  usuario: null,
  perfil: null,
  autenticado: false,

  login: (dados) => {
    const usuario = {
      ...dados,
      ultimoAcesso: new Date().toISOString(),
    };
    localStorage.setItem("aac_usuario", JSON.stringify(usuario));
    set({ usuario, perfil: PERFIS[dados.perfil], autenticado: true });
  },

  logout: () => {
    localStorage.removeItem("aac_usuario");
    set({ usuario: null, perfil: null, autenticado: false });
  },

  carregarSessao: () => {
    const salvo = localStorage.getItem("aac_usuario");
    if (salvo) {
      const u = JSON.parse(salvo);
      set({ usuario: u, perfil: PERFIS[u.perfil], autenticado: true });
    }
  }
}));
