AAC Painel Interno v6.2.1 - Correção certidão

Correção aplicada:
- Removido uso incorreto de .catch() diretamente nas queries do Supabase.
- Corrigido erro ao gerar Certidão de Inteiro Teor do Associado.
- Corrigido carregamento opcional de alertas, mensalidades, atas, protocolos e biblioteca documental.
- Build testado com sucesso.

Não precisa rodar SQL novamente se a v6.2 já foi aplicada.
Copie o .env antigo para esta pasta, rode npm/pnpm install e npm/pnpm run dev.
Para publicar, rode build e envie a pasta dist para o Netlify.
