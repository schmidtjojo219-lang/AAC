Painel Interno AAC - v6.4

Inclui:
- Correção completa de Atas, Protocolos, Documentos e Biblioteca Documental.
- Upload de arquivos internos para protocolos, documentos e biblioteca.
- v6.3: Backup e exportações CSV/JSON.
- v6.4: Validação pública de documentos por código/link.
- Certidão do associado e atas passam a registrar código de validação.
- Recibos de mensalidade também passam a gerar código de validação.

Como atualizar:
1. Copie seu arquivo .env antigo para esta pasta.
2. No Supabase, rode o SQL:
   sql/atualizacao-v6-3-v6-4.sql
3. No PowerShell, nesta pasta:
   pnpm install
   pnpm run dev
4. Se estiver tudo certo:
   pnpm run build
5. Faça deploy da pasta dist no mesmo projeto do Netlify do painel.

Observação:
O aviso do Vite sobre arquivo JS maior que 500 kB não impede o deploy.
