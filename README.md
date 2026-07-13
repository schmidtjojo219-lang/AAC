# Painel Interno AAC - Versão 5

Sistema interno da Associação Amigos Carroceiros - AAC para uso em:

`https://painel.amigoscarroceiros.org.br`

## Novidades da versão 5

- Prontuário completo do animal/RGA.
- Cadastro ampliado do animal: raça, sexo, nascimento, porte, peso estimado, finalidade de uso e condição geral.
- Upload de fotos do animal: lateral esquerda, lateral direita, frontal, traseira, marcas específicas e carroça/conjunto.
- Histórico de vistorias com responsável, resultado, estado físico, cascos/ferraduras, próxima vistoria, observações e anexo.
- Controle sanitário por registro: AIE, Mormo, vacina, vermifugação, atendimento e outros.
- Controle de validade de exames, vacinas, vermifugação e próxima vistoria.
- Alertas internos para RGA pendente/suspenso, exame vencido, vacina vencida e vistoria próxima/vencida.
- Geração de prontuário completo em PDF com fotos, histórico e QR Code.
- Consulta pública do RGA atualizada com mais dados não sensíveis.

## Atualização a partir da v4

1. Copie o seu `.env` antigo para esta pasta.
2. No Supabase, execute apenas:

`sql/atualizacao-v5.sql`

3. Instale/rode localmente:

```bash
pnpm install
pnpm run dev
```

ou, se estiver usando npm:

```bash
npm install
npm run dev
```

## Deploy no Netlify

Depois de testar localmente:

```bash
pnpm run build
```

Suba a pasta `dist` no mesmo projeto Netlify do painel.

## Ordem de SQL se for instalar do zero

Em um projeto Supabase novo, rode nesta ordem:

1. `sql/supabase-schema.sql`
2. `sql/atualizacao-v2.sql`
3. `sql/atualizacao-v3.sql`
4. `sql/atualizacao-v4.sql`
5. `sql/atualizacao-v5.sql`

Depois crie o usuário em `Authentication > Users` e adicione o perfil admin em `public.profiles`.

## Variáveis de ambiente

Crie um arquivo `.env` na raiz, junto ao `package.json`:

```env
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=SUA_CHAVE_PUBLICA_DO_SUPABASE
```

Use a `Publishable key` do Supabase. Não use a `Secret key` no frontend.


## Correção V5.1

Esta versão corrige o erro do Supabase ao recriar a view `consulta_publica_rga` e adiciona numeração automática:

- matrícula do associado: `AAC-0001`;
- número da ficha: `0001/2026`;
- número do RGA: `AAC-RGA-0001/2026`.

Para atualizar, execute no Supabase o arquivo:

```text
sql/atualizacao-v5.sql
```

Ele pode ser executado mesmo se a V5 anterior tiver parado no erro da view.
