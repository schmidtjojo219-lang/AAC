import { create } from "zustand";
import { PERFIS, resolverPerfil } from "./perfis";

// Utilitário SEGURO de localStorage — NUNCA MAIS quebra o sistema por JSON corrompido
const lerLS = (chave, padrao = null) => {
  try {
    const raw = localStorage.getItem(chave);
    return raw ? JSON.parse(raw) : padrao;
  } catch { return padrao; }
};
const salvarLS = (chave, valor) => {
  try { localStorage.setItem(chave, JSON.stringify(valor)); } catch {}
};

export const useAuthStore = create((set, get) => ({
  usuario: null,
  perfilChave: null,   // ex: "DIRETOR_PRESIDENTE" — USAR ESSA PARA TUDO
  perfil: null,        // objeto completo
  autenticado: false,
  carregando: true,    // 🔴 EVITA REDIRECIONAMENTO PREMATURO

  login: (dados) => {
    const perfilObj = resolverPerfil(dados.perfil);
    const usuario = { ...dados, ultimoAcesso: new Date().toISOString(), perfil: undefined };
    salvarLS("aac_usuario", { ...usuario, perfilChave: dados.perfil });
    set({ usuario, perfilChave: dados.perfil, perfil: perfilObj, autenticado: !!perfilObj, carregando: false });
  },

  logout: () => {
    try { localStorage.removeItem("aac_usuario"); } catch {}
    set({ usuario: null, perfilChave: null, perfil: null, autenticado: false, carregando: false });
  },

  // 🔴 AGORA CARREGA SESSÃO ANTES DE QUALQUER COISA
  carregarSessao: () => {
    const salvo = lerLS("aac_usuario");
    if (salvo && salvo.perfilChave) {
      const p = resolverPerfil(salvo.perfilChave);
      if (p) { set({ usuario: salvo, perfilChave: salvo.perfilChave, perfil: p, autenticado: true, carregando: false }); return; }
    }
    set({ carregando: false });
  }
}));