AAC Painel Interno v7.1 - Documentos Profissionais e Correcoes

Esta versao junta a estabilizacao da v7.0.1 com a evolucao documental da v7.1.

Correcoes principais:

1. Dashboard
- Corrige o saldo do caixa no dashboard.
- Taxa de boleto de mensalidade nao e descontada duas vezes no saldo, pois a mensalidade ja entra distribuida pelo valor liquido.

2. Assinatura eletronica
- Corrige o erro SQL:
  function digest(text, unknown) does not exist
- A assinatura agora usa extensions.digest(convert_to(...), 'sha256'), formato adequado para Supabase.

3. Editor de documentos
- Corrige o problema de escrita de tras para frente.
- O editor deixa de re-renderizar o texto a cada tecla.
- Nova area visual em formato de pagina, com cabecalho institucional da AAC.
- Barra de ferramentas ampliada: negrito, italico, sublinhado, H1, H2, texto, listas, alinhamento, justificar, imagem e tabela.

4. Associados como interessados e assinantes
- Ao criar documento, e possivel selecionar o interessado pela lista de associados.
- Ao adicionar assinante, e possivel selecionar associado cadastrado.
- O sistema puxa nome, CPF, telefone/WhatsApp e e-mail automaticamente.
- O usuario so ajusta o cargo/funcao.

5. CPF e telefone
- CPF e WhatsApp passam a ser formatados tambem na area de documentos e na tela publica de assinatura.

6. Documentos no modelo AAC
- O PDF gerado pela Mesa Administrativa sai com cabecalho institucional da AAC.
- Inclui QR Code/codigo de validacao quando o documento ja possui validacao.
- Mantem hash SHA-256 do conteudo.

7. Documentos gerados pelo sistema tambem podem virar documentos assinaveis
- Em Associados: botao "Ficha assinavel".
- Em Animais/RGA: botao "RGA assinavel".
- O documento e enviado para a Mesa Administrativa e pode receber assinantes/WhatsApp.

8. Assinaturas oficiais em PNG
- Nova aba "Assinaturas oficiais" dentro de Documentos e Processos.
- Permite cadastrar Presidente, Secretaria e Bem-Estar Animal.
- Aceita URL do PNG ou upload de imagem.
- As carteirinhas passam a puxar essas assinaturas.

9. Carteirinhas
- Carteirinha do associado: verso com Presidente e Secretaria.
- Carteirinha RGA: verso com Presidente e Bem-Estar Animal.

Como atualizar:

1. Rode no Supabase:
   sql/atualizacao-v7-1-documentos-profissionais.sql

2. Depois, no PowerShell, dentro da pasta do projeto:
   npm install
   npm run dev

3. Para publicar no Netlify:
   npm run build

Observacao importante:
Este pacote nao acompanha a pasta dist pronta. Rode npm run build depois de instalar as dependencias.
