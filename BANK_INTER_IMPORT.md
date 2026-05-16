# Importacao Banco Inter PJ

## Formatos aceitos

- CSV exportado pelo Banco Inter.
- OFX/TXT quando o conteudo textual vier estruturado.
- PDF/XLSX: bloqueados nesta fase se nao puderem ser lidos com seguranca.

## Como exportar

1. Acesse a conta PJ do Inter.
2. Abra Extrato.
3. Filtre o periodo desejado.
4. Exporte preferencialmente em CSV.
5. No JARVIS, abra `/finance/import`.
6. Escolha a conta `PJ DO INTER`.
7. Envie o arquivo.
8. Revise as linhas antes de importar.

## Campos esperados

O parser tenta identificar:

- Data.
- Descricao/Historico.
- Valor.
- Credito/Debito.
- Saldo.
- Identificador externo quando existir.

## Heuristicas Inter

- `PIX recebido`: entrada.
- `PIX enviado`: saida ou transferencia.
- `Pagamento boleto`: saida.
- `Tarifa`: despesa em Tarifas bancarias.
- `Estorno`: entrada.
- `Rendimento`: outros recebimentos.
- `Transferencia entre contas proprias`: transferencia quando identificavel.

## Revisao e duplicatas

O JARVIS marca possiveis duplicatas quando encontra mesma conta, data, valor e descricao parecida, ou mesmo identificador externo.

Nada e importado automaticamente. Use a tela de revisao para:

- Aprovar linhas pendentes.
- Ignorar duplicatas.
- Ajustar categoria.
- Importar somente aprovadas.

## Limites

Nao envie extratos completos para provedores externos sem consentimento explicito. A categorizacao padrao e local e baseada em regras/palavras-chave.
