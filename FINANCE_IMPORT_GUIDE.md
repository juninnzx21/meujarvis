# Guia de importacao financeira segura

## Formatos recomendados

1. **OFX**: formato principal para importacao automatica. Contem data, valor, tipo, memo, FITID e metadados bancarios.
2. **CSV**: fallback confiavel para revisao. No Banco Inter PJ, o parser reconhece `Conta`, `Periodo`, `Saldo` e a tabela `Data Lancamento;Historico;Descricao;Valor;Saldo`.
3. **PDF**: somente conferencia manual. Nao deve ser usado como fonte principal de importacao em massa.

## Fluxo seguro

1. Envie o arquivo pelo painel em `/finance/import` ou pelo WhatsApp.
2. O JARVIS salva o arquivo em `backend/storage/imports` ou `backend/storage/imports/whatsapp`.
3. O arquivo e parseado localmente, sem envio para OpenAI/Gemini.
4. O sistema cria um `StatementImport` e varias `StatementImportRow`.
5. Nenhum lancamento confirmado e criado automaticamente.
6. Revise em `/finance/import/{id}/review`.
7. Aprove linhas confiaveis ou corrija manualmente.
8. Clique em importar aprovadas e confirme.

## Duplicatas

- OFX usa `FITID` como chave principal.
- CSV gera um hash deterministico com conta, data, valor, historico, descricao e indice da linha.
- Fallback compara conta, data, valor e descricao normalizada.

## Banco Inter PJ

Quando o extrato indicar Banco Inter, codigo `077` e conta `439443873`, o JARVIS procura uma conta existente. Se confirmado pelo usuario, cria/usa:

- Banco: Banco Inter
- Codigo: 077
- Conta: 439443873
- Nome: PJ DO INTER
- Tipo: business

## Privacidade

- O conteudo bruto do extrato nao deve aparecer em logs.
- Backups, uploads e extratos ficam fora do Git.
- Dados sensiveis devem permanecer apenas em armazenamento local/seguro.
