// MENU OFICIAL — 9 CENTRAIS DE GESTÃO (Especificação v8.0)
export const MENU_CENTRAIS = [
  { id: "mesa", nome: "Mesa Administrativa", icone: "🏛️", rota: "/", permissao: "workspace.ler" },
  { id: "pessoas", nome: "Central de Pessoas", icone: "👥", rota: "/pessoas", permissao: "pessoas.ler" },
  { id: "animais", nome: "Central Animal", icone: "🐎", rota: "/animais", permissao: "animais.ler" },
  { id: "financeiro", nome: "Central Financeira", icone: "💰", rota: "/financeiro", permissao: "financeiro.ler" },
  { id: "documentos", nome: "Central Documental", icone: "📄", rota: "/documentos", permissao: "documentos.ler" },
  { id: "processos", nome: "Central de Processos", icone: "📂", rota: "/processos", permissao: "processos.ler" },
  { id: "estatisticas", nome: "Inteligência e Estatísticas", icone: "📊", rota: "/estatisticas", permissao: "estatisticas.ler" },
  { id: "portal", nome: "Portal Institucional", icone: "🌐", rota: "/portal", permissao: "portal.ler" },
  { id: "admin", nome: "Administração", icone: "⚙️", rota: "/admin", permissao: "admin.gerir" },
];
