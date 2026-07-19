// PERFIS DE ACESSO OFICIAIS — AAC v8.0
// Lógica reescrita: funciona com CHAVE STRING, ID NUMÉRICO ou OBJETO PERFIL
export const PERFIS = {
  DIRETOR_PRESIDENTE: { id: 1, nome: "Diretor Presidente", sigla: "DP", permissoes: ["*"] },
  DIRETOR_VICE:       { id: 2, nome: "Diretor Vice-Presidente", sigla: "VP", permissoes: ["*"] },
  SECRETARIO:         { id: 3, nome: "Secretário Geral", sigla: "SEC",
    permissoes: ["pessoas.*","animais.*","documentos.*","processos.*","estatisticas.*","portal.*","workspace.*"] },
  TESOUREIRO:         { id: 4, nome: "Tesoureiro", sigla: "TES",
    permissoes: ["financeiro.*","estatisticas.*","pessoas.ler","animais.ler","workspace.*"] },
  CONSELHO_FISCAL:    { id: 5, nome: "Conselho Fiscal", sigla: "CF",
    permissoes: ["financeiro.ler","documentos.ler","processos.ler","estatisticas.ler","pessoas.ler","animais.ler"] },
  ASSOCIADO:          { id: 6, nome: "Associado", sigla: "ASSOC",
    permissoes: ["pessoas.proprio","financeiro.proprio","animais.proprio","documentos.ler_proprios","portal.ler","workspace.*"] },
  PUBLICO:            { id: 7, nome: "Público Externo", sigla: "PUB",
    permissoes: ["portal.ler","validacao.publica"] },
};

// Lista indexada por ID também
const PERFIS_POR_ID = Object.fromEntries(Object.values(PERFIS).map(p => [p.id, p]));

// Resolve qualquer entrada para o objeto PERFIL completo
export const resolverPerfil = (entrada) => {
  if (!entrada) return null;
  if (typeof entrada === "object") return entrada.permissoes ? entrada : null; // já é perfil
  if (typeof entrada === "number") return PERFIS_POR_ID[entrada] || null;
  if (typeof entrada === "string") return PERFIS[entrada] || PERFIS_POR_ID[Number(entrada)] || null;
  return null;
};

// ✅ LÓGICA CORRETA — FINALMENTE
// Retorna TRUE se o perfil tiver permissão para executar a ação
export const verificarPermissao = (entradaPerfil, permissaoRequerida) => {
  const perfil = resolverPerfil(entradaPerfil);
  if (!perfil || !perfil.permissoes) return false;
  if (!permissaoRequerida) return true;

  const [modReq, acaoReq] = permissaoRequerida.split(".");
  if (!acaoReq) return false;

  for (const p of perfil.permissoes) {
    if (p === "*") return true;                                // tudo liberado
    if (p === permissaoRequerida) return true;                 // exata
    const [modP, acaoP] = p.split(".");
    if (modP === modReq && acaoP === "*") return true;         // modulo.* cobre qualquer ação
    if (p === "ler" && (acaoReq === "ler" || acaoReq.startsWith("ler_"))) return true;
  }
  return false;
};

export default PERFIS;