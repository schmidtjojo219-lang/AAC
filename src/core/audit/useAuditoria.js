import SHA256 from "crypto-js/sha256";
import { useAuthStore } from "../auth/authStore";

// REGISTRA TUDO — Toda alteração no sistema passa por aqui
// Campos: quem, quando, módulo, ação, valor_antigo, valor_novo, hash, IP
export const useAuditoria = () => {
  const { usuario } = useAuthStore();

  const registrar = async ({ modulo, acao, valorAntigo = null, valorNovo, objetoId = null }) => {
    const agora = new Date();
    const registro = {
      id: crypto.randomUUID(),
      dataHora: agora.toISOString(),
      usuarioId: usuario?.id || null,
      usuarioNome: usuario?.nome || "SISTEMA",
      perfil: usuario?.perfil || "PUBLICO",
      ip: await pegarIP(),
      modulo,
      acao, // CRIAR, ALTERAR, EXCLUIR, ASSINAR, PAGAR, etc.
      objetoId,
      valorAntigo,
      valorNovo,
      hash: null,
    };

    // Gerar HASH SHA-256 do registro (princípio de não repúdio)
    const base = ${registro.id};
    registro.hash = SHA256(base).toString();

    // Salvar (em produção = API; desenvolvimento = localStorage + logs)
    const logs = JSON.parse(localStorage.getItem("aac_auditoria") || "[]");
    logs.unshift(registro);
    localStorage.setItem("aac_auditoria", JSON.stringify(logs.slice(0, 10000))); // últimos 10k
    console.log([AUDITORIA]  |  |  | HASH: ...);
    return registro;
  };

  return { registrar };
};

const pegarIP = async () => {
  try {
    const res = await fetch("https://api.ipify.org?format=json");
    return (await res.json()).ip;
  } catch { return "0.0.0.0"; }
};
