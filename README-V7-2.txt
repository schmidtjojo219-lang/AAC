AAC Painel Interno v7.2 - Assinatura do Documento Original

Esta versao corrige o fluxo da Mesa de Assinaturas.

Principais correcoes:

1. Ficha de inscricao e RGA
- Ao enviar para a Mesa de Assinaturas, o sistema nao cria mais um documento resumido/generico.
- A mesa recebe a ficha original gerada pelo proprio sistema, com o mesmo layout oficial.
- O mesmo vale para a ficha RGA.

2. Arquivamento automatico
- Quando todos os assinantes obrigatorios concluem a assinatura, o documento muda para status "arquivado".
- O documento arquivado fica travado para preservar hash, validade e historico.
- Apenas a versao final assinada fica como versao oficial.

3. Vinculo automatico ao cadastro
- Ficha de inscricao assinada volta vinculada ao cadastro do associado.
- Ficha RGA assinada volta vinculada ao cadastro do animal.
- A tela do associado/animal mostra quando o documento foi arquivado pela Mesa de Assinaturas.

4. Hash e validacao
- Cada assinatura recebe hash SHA-256.
- O documento final recebe hash SHA-256 final.
- O sistema cria codigo de validacao publica e QR Code para o documento final.
- O texto deixa claro que e assinatura eletronica da AAC com SHA-256, sem certificacao ICP-Brasil.

5. Carteirinhas
- As assinaturas do verso foram reposicionadas para a area inferior.
- As imagens PNG das assinaturas ficam menores para nao sobrepor texto.

6. Documentos oficiais
- A impressao/geracao do documento final usa cabecalho institucional AAC.
- Para documentos criados no editor, o sistema usa modelo oficial com logo, CNPJ, sede, conteudo, controle interno, QR Code e blocos de assinatura.
- Para ficha/RGA, o sistema preserva o layout original.

Correção v7.2.1:
- O botão "Gerar ficha em PDF" no cadastro do associado agora abre a versão assinada quando existir ficha arquivada pela Mesa de Assinaturas.
- A lista de associados mostra botão "Assinada" quando a ficha final estiver vinculada.
- O mesmo comportamento foi aplicado ao RGA: se existir ficha RGA assinada, o botão abre a versão assinada.
- A versão original sem assinatura continua sendo usada apenas quando ainda não houver documento final arquivado.

Correção v7.2.2:
- Corrige erro ao salvar associado: invalid input syntax for type uuid: "".
- Campos de vínculo de ficha assinada vazios agora são enviados como null.
- Aplica a mesma proteção ao cadastro de Animais/RGA.

Como atualizar:

1. Rode no Supabase, nesta ordem:
   sql/atualizacao-v7-1-documentos-profissionais.sql
   sql/atualizacao-v7-2-assinatura-documento-original.sql

2. Depois, no PowerShell, dentro da pasta do projeto:
   npm install
   npm run dev

3. Para publicar no Netlify:
   npm run build

Observacao:
Este pacote nao acompanha a pasta dist pronta. Rode npm run build depois de instalar as dependencias.
