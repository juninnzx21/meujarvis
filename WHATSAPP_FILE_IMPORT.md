# Importacao de extratos pelo WhatsApp

## Como enviar

Envie para o numero conectado ao JARVIS um arquivo `.ofx` ou `.csv` exportado do banco. O melhor formato e **OFX**.

Por seguranca, o JARVIS so processa mensagens, audios e arquivos quando a frase **"ei jarvis"** estiver presente no texto, legenda do arquivo ou transcricao do audio.

Exemplos:

- `ei jarvis entrada pix recebido R$ 120,00 cliente Joao`
- `ei jarvis importar extrato`
- `ei jarvis quais foram minhas entradas do mes?`

Mensagem esperada do JARVIS:

`Recebi seu extrato. Detectei OFX/CSV, banco, conta e quantidade de movimentacoes. Preparei uma previa segura antes de importar.`

## Fluxo

1. Evolution API recebe o arquivo.
2. O webhook `POST /api/whatsapp/webhook` valida a frase `ei jarvis`.
3. O JARVIS baixa a midia de forma segura.
4. O arquivo e salvo em `backend/storage/imports/whatsapp`.
5. O parser OFX/CSV cria uma previa.
6. O usuario revisa em `/finance/import/{id}/review`.
7. A importacao so ocorre depois de aprovacao e confirmacao.

## Formatos aceitos

- `.ofx`: recomendado.
- `.csv`: aceito como fallback.
- `.txt`: aceito quando segue estrutura CSV.
- `.xlsx` e `.pdf`: recusados para importacao automatica nesta fase, usados apenas como referencia/conferencia.

## Seguranca

- O extrato bruto nao e enviado para IA externa por padrao.
- Mensagens sem `ei jarvis` sao registradas como ignoradas e nao executam tarefas.
- Logs registram apenas `fileType`, `rowCount`, `importId`, `bankName` e status.
- Conteudo completo de linhas bancarias nao deve ser logado.
- Arquivos ficam fora do Git.
