import SHA256 from "crypto-js/sha256";
import { useAuthStore } from "../auth/authStore";

// Fallback UUID — funciona em QUALQUER navegador
const uuid = () => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === "x" ? r : (r & 0x3 | 0x8)).toString(16);
  });
};

// Fetch com timeout — não trava a aplicação
const fetchComTimeout = (url, ms = 3000) =>
  Promise.race([fetch(url), new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), ms))]);

const pegarIP = async () => {
  try {
    const res = await fetchComTimeout("https://api.ipify.org?format=json");
    return (await res.json()).ip;
  } catch { return "0.0.0.0"; }
};

// localStorage SEGURO
const lerLS = (c, p) => { try { const r = localStorage.getItem(c); return r ? JSON.parse(r) : p; } catch { return p; } };
const salvarLS = (c, v) => { try { localStorage.setItem(c, JSON.stringify(v)); } catch {} };

// ============================================================
// NÚCLEO PURO — funciona EM QUALQUER LUGAR (Stores, componentes, serviços)
// ============================================================
export const auditoria = {
  registrar: async ({ modulo, acao, valorAntigo = null, valorNovo, objetoId = null }) => {
    try {
      const usuario = useAuthStore.getState().usuario;
      const agora = new Date();
      const registro = {
        id: uuid(),
        dataHora: agora.toISOString(),
        usuarioId: usuario?.id || null,
        usuarioNome: usuario?.nome || "SISTEMA",
        perfil: usuario?.perfilChave || "PUBLICO",
        ip: await pegarIP(),
        modulo, acao, objetoId, valorAntigo, valorNovo, hash: null,
      };

      // Template string com CRASES — preservada 100%
      const base = `${registro.id}${registro.dataHora}${registro.usuarioId || ""}${registro.modulo}${JSON.stringify(valorNovo || "")}`;
      registro.hash = SHA256(base).toString();

      const logs = lerLS("aac_auditoria", []);
      logs.unshift(registro);
      salvarLS("aac_auditoria", logs.slice(0, 10000));

      // eslint-disable-next-line no-console
      console.log(`[AUDITORIA] ${registro.modulo} | ${registro.acao} | ${registro.usuarioNome} | HASH: ${registro.hash.substring(0,16)}...`);
      return registro;
    } catch (e) {
      // Nunca deixa auditoria quebrar o resto do sistema
      // eslint-disable-next-line no-console
      console.error("[AUDITORIA FALHA]", e);
      return null;
    }
  }
};

// Hook wrapper para componentes React
export const useAuditoria = () => ({ registrar: auditoria.registrar });
export default auditoria;