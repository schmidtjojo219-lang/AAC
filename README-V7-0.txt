AAC Painel Interno v7.0 - Mesa Administrativa

ATENCAO: esta pasta foi atualizada para a v7.1. Para a versao mais nova, leia README-V7-1.txt e execute:
sql/atualizacao-v7-1-documentos-profissionais.sql

Esta versao reestrutura a area documental do painel com uma logica inspirada em Mesa Virtual/SIPAC, adaptada para a realidade da Associacao Amigos Carroceiros.

Principais novidades:

1. Documentos e Processos
- Menu unificado "Documentos e Processos".
- Editor visual tipo Word para criar documentos oficiais.
- Galeria de modelos: Ata, Oficio, Resolucao, Parecer, Termo de Voluntariado e Documento Livre.
- Vinculo de documento com processo administrativo.
- Controle de status: rascunho, em assinatura, assinado, publicado, arquivado e cancelado.
- Geracao de hash SHA-256 e codigo de validacao.

2. Processos administrativos
- Cadastro de processos com numero, tipo, interessado, prioridade e status.
- Registro de despachos, ciencia, movimentacoes e arquivamento.
- Historico do processo.

3. Assinatura por WhatsApp
- Selecao de assinantes por documento.
- Registro de nome, cargo, CPF e WhatsApp.
- Link seguro para assinatura.
- Botao para enviar mensagem pronta pelo WhatsApp.
- Tela publica /assinar/:token para aceite e assinatura.
- Registro de data, hora, CPF informado, IP e hash da assinatura.

4. Associados
- CPF formatado durante a digitacao.
- Telefone/WhatsApp formatado durante a digitacao.
- Opcao "Associado nao possui e-mail".
- Autorizacao para comunicados oficiais por WhatsApp.
- Controle de isencao de mensalidade: sem isencao, primeiro mes, ate data ou permanente.

5. Mensalidades
- Geracao mensal respeita isencoes cadastradas no associado.
- Associado isento gera mensalidade com status "isento", valor R$ 0,00 e sem lancamento financeiro.

6. Financeiro
- Cards com saldo por fundo do planejamento financeiro vigente.
- Entrada manual pode ser distribuida automaticamente pelos percentuais ou destinada a um fundo especifico.
- Saidas continuam exigindo selecao de fundo quando vinculadas ao planejamento.

7. Dashboard
- Novos indicadores de documentos, processos abertos e assinaturas pendentes.

Antes de usar:
1. Execute no Supabase:
   sql/atualizacao-v7-0-mesa-administrativa.sql

2. Depois rode no projeto:
   npm install
   npm run dev

3. Para publicar:
   npm run build
   envie a pasta dist para o Netlify.

Observacao:
A assinatura implementada e uma assinatura eletronica interna da AAC, com login/link, hash, registro de aceite e validacao. Ela nao substitui certificado digital ICP-Brasil quando uma situacao exigir esse formato especifico.
