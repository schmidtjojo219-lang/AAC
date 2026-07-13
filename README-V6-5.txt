Painel Interno AAC - v6.5 Site Integrado

Novidades:
- Notícias cadastradas no painel aparecem automaticamente no site público.
- Respostas dos formulários do site público entram direto no painel em Formulários do Site.
- Nova tabela public.site_formularios com RLS: anon só insere; usuários autenticados leem e atualizam.
- Política pública de leitura das notícias publicadas.

Passos:
1. Copie seu .env para esta pasta.
2. Execute no Supabase: sql/atualizacao-v6-5-site-integrado.sql
3. Rode localmente: pnpm install && pnpm run dev
4. Build: pnpm run build
5. Envie dist para o Netlify do painel.

Site público:
- Envie a nova versão do site público v3 para o Netlify do site.
- O arquivo site-config.js contém URL e chave publishable do Supabase. Não use secret key nele.
