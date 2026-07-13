Painel Interno AAC - V6.2

Correções e melhorias incluídas:
- Correção de anexos em Protocolos, Biblioteca Documental e Documentos.
- Campos de data vazios em atas/protocolos/documentos agora são tratados corretamente.
- Melhor detalhamento de erros do Supabase nas telas de secretaria.
- Documento simples da tela Documentos agora aceita arquivo interno, não só link externo.
- Carteirinha do Animal/RGA com QR Code de consulta pública.
- Certidão Cadastral de Inteiro Teor do Associado, com animais/RGA vinculados e resumo financeiro.

Passos:
1. Copie o .env da versão atual para esta pasta.
2. No Supabase, execute: sql/atualizacao-v6-2.sql
3. Rode localmente:
   pnpm install
   pnpm run dev
4. Para publicar:
   pnpm run build
   Suba a pasta dist no mesmo projeto do painel no Netlify.

Observação:
Se os uploads ainda falharem, verifique se o usuário logado possui perfil ativo em public.profiles e se está como admin, presidencia, secretaria, tesouraria, bem_estar_animal ou conselho_fiscal.
