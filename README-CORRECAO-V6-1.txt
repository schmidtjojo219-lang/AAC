Correção v6.1 — salvar animal/RGA

Esta versão corrige o erro 400 ao salvar animal/RGA quando campos opcionais de data ou controle sanitário ficam em branco.

O problema ocorria porque campos de data vazios podiam ser enviados como string vazia ("") ao Supabase. O PostgreSQL espera NULL para datas sem preenchimento.

Não é necessário rodar SQL novo. A correção é apenas no frontend.
