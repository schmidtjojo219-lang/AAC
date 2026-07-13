AAC Painel Interno v6.6 — Planejamento Financeiro e Prestação de Contas

Novidades:
- Nova tela Planejamento Financeiro.
- Fundos dinâmicos sem nomes ou percentuais iniciais obrigatórios.
- Validação de soma exatamente 100%.
- Receitas esperadas recorrentes ou esporádicas.
- Taxa operacional padrão R$ 0,99 editável.
- Distribuição automática de entradas líquidas por fundos no Financeiro.
- Saídas vinculadas a fundo específico.
- Nova tela Prestação de Contas por período mensal, trimestral, semestral, anual ou personalizado.
- PDFs de Planejamento Financeiro e Prestação de Contas com código de validação e QR Code.

Instalação:
1. Copie seu .env para a pasta do projeto.
2. No Supabase, rode sql/atualizacao-v6-6-planejamento-financeiro.sql.
3. Rode pnpm install e pnpm run dev para testar.
4. Rode pnpm run build e publique a pasta dist no Netlify.
