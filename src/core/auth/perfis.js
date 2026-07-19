// PERFIS DE ACESSO OFICIAIS — AAC v8.0
// Não editar manualmente — alterar somente via Administração
export const PERFIS = {
  DIRETOR_PRESIDENTE: {
    id: 1,
    nome: "Diretor Presidente",
    sigla: "DP",
    permissoes: ["*"], // TUDO
  },
  DIRETOR_VICE: {
    id: 2,
    nome: "Diretor Vice-Presidente",
    sigla: "VP",
    permissoes: ["*"],
  },
  SECRETARIO: {
    id: 3,
    nome: "Secretário Geral",
    sigla: "SEC",
    permissoes: [
      "pessoas.*", "animais.*", "documentos.*", "processos.*",
      "estatisticas.ler", "portal.*", "workspace.*"
    ],
  },
  TESOUREIRO: {
    id: 4,
    nome: "Tesoureiro",
    sigla: "TES",
    permissoes: [
      "financeiro.*", "estatisticas.*", "pessoas.ler",
      "animais.ler", "workspace.*"
    ],
  },
  CONSELHO_FISCAL: {
    id: 5,
    nome: "Conselho Fiscal",
    sigla: "CF",
    permissoes: [
      "financeiro.ler", "documentos.ler", "processos.ler",
      "estatisticas.ler", "pessoas.ler", "animais.ler"
    ],
  },
  ASSOCIADO: {
    id: 6,
    nome: "Associado",
    sigla: "ASSOC",
    permissoes: [
      "pessoas.proprio", "financeiro.proprio",
      "animais.proprio", "documentos.ler_proprios",
      "portal.ler", "workspace.*"
    ],
  },
  PUBLICO: {
    id: 7,
    nome: "Público Externo",
    sigla: "PUB",
    permissoes: ["portal.ler", "validacao.publica"],
  }
};

export const verificarPermissao = (perfilUsuario, permissaoRequerida) => {
  if (!perfilUsuario) return false;
  const perfil = PERFIS[perfilUsuario];
  if (!perfil) return false;
  if (perfil.permissoes.includes("*")) return true;
  return perfil.permissoes.some(p => {
    if (p === permissaoRequerida) return true;
    const modulo = p.split(".")[0] + ".*";
    return modulo === permissaoRequerida;
  });
};
