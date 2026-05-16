# Importacao Banco Inter PJ

## Atualizacao 2026-05-16 - OFX e CSV pelo WhatsApp

Para Banco Inter PJ, o formato prioritario agora e **OFX**. O CSV continua suportado como fallback confiavel.

Metadados esperados no extrato de referencia:

- Banco: Banco Inter / Intermedium
- Codigo: 077
- Conta: 439443873
- Tipo: CHECKING / Conta Corrente PJ
- Periodo: 17/10/2024 a 16/05/2026
- Saldo final: R$ 326,05
- Total esperado: 2221 transacoes

O PDF deve ser usado apenas para conferencia, nao para importacao em massa.

Fluxo obrigatorio:

1. Upload pelo painel ou envio por WhatsApp.
2. Parser local OFX/CSV.
3. Criacao de `StatementImport` e linhas em revisao.
4. Deteccao de duplicatas por FITID/hash deterministico.
5. Revisao em `/finance/import/{id}/review`.
6. Importacao somente das linhas aprovadas.

## Formatos aceitos

- OFX exportado pelo Banco Inter.
- CSV exportado pelo Banco Inter.
- TXT quando o conteudo textual vier estruturado como CSV.
- PDF/XLSX: bloqueados nesta fase se nao puderem ser lidos com seguranca.

## Como exportar

1. Acesse a conta PJ do Inter.
2. Abra Extrato.
3. Filtre o periodo desejado.
4. Exporte preferencialmente em OFX; use CSV como fallback.
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
