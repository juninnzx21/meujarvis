# Modulo Financeiro JARVIS - Fase 7

## Objetivo

O modulo financeiro nativo transforma o JARVIS em um assistente financeiro pessoal/empresarial para contas bancarias, categorias, lancamentos, importacao de extratos e relatorios.

## Recursos implementados

- Contas bancarias: cadastro de banco, tipo, nome da conta, saldo atual e status ativo.
- Categorias financeiras: receitas, despesas, transferencias e ajustes com palavras-chave.
- Lancamentos: entradas, saidas, transferencias e ajustes com saldo atualizado automaticamente.
- Assistente guiado: coleta conta, origem/destino, sugere categoria e pede confirmacao antes de salvar.
- Importacao de extratos: upload seguro de CSV/OFX/TXT, salvamento temporario fora do Git e parser local.
- Revisao obrigatoria: nenhuma linha de extrato e importada sem aprovacao.
- Duplicidade: detecta lancamentos por conta, data, valor, descricao e id externo quando disponivel.
- Relatorios: saldo por conta, entradas/saidas do mes, resultado estimado, categorias e fluxo de caixa.
- Logs redigidos: logs gravam metadados resumidos, sem extrato completo.

## URLs do painel

- `/finance`: visao geral financeira.
- `/finance/accounts`: contas bancarias.
- `/finance/transactions`: lancamentos.
- `/finance/categories`: categorias.
- `/finance/import`: importacao de extrato.
- `/finance/import/:id/review`: revisao de importacao.
- `/finance/review`: pagina segura de revisao sem importacao selecionada.
- `/finance/reports`: relatorios financeiros.

## Endpoints principais

- `GET /api/finance/bank-accounts`
- `POST /api/finance/bank-accounts`
- `PUT /api/finance/bank-accounts/:id`
- `GET /api/finance/categories`
- `POST /api/finance/categories`
- `PUT /api/finance/categories/:id`
- `GET /api/finance/ledger/transactions`
- `POST /api/finance/transactions`
- `POST /api/finance/assistant`
- `POST /api/finance/imports/upload`
- `GET /api/finance/imports/:id`
- `PATCH /api/finance/imports/:id/rows/:rowId`
- `POST /api/finance/imports/:id/approve-all`
- `POST /api/finance/imports/:id/import-approved`
- `GET /api/finance/reports/summary`
- `GET /api/finance/reports/monthly`
- `GET /api/finance/reports/categories`
- `GET /api/finance/reports/accounts`
- `GET /api/finance/reports/cashflow`

## Fluxo guiado no chat

Exemplo:

1. Usuario: `adicionar entrada de 500`
2. JARVIS: pergunta a conta.
3. Usuario: `Inter PJ`
4. JARVIS: pergunta origem/destino.
5. Usuario: `cliente site autopecas`
6. JARVIS: sugere categoria e mostra resumo.
7. Usuario: `sim`
8. JARVIS: salva o lancamento e atualiza saldo.

Se a conta nao existir, o JARVIS pergunta se deve criar e solicita saldo inicial. Se a categoria for incerta, o lancamento pode ficar `pending_review`.

## Segurança

- Extratos ficam em `backend/storage/imports`, ignorado pelo Git.
- Extratos nao sao enviados para OpenAI/Gemini por padrao.
- PDF/XLSX sao recusados com mensagem amigavel quando nao puderem ser interpretados com seguranca.
- Importacao exige revisao/aprovacao antes de gravar transacoes.
- Logs nao devem conter CPF/CNPJ, chave Pix, tokens ou conteudo completo de extrato.
- Exclusao de dados financeiros deve exigir confirmacao em futuras telas destrutivas.

## Limitacoes atuais

- Parser de CSV/OFX/TXT e heuristico.
- PDF e XLSX ainda nao tem parser confiavel nesta fase.
- Regras automaticas existem no backend, mas a criacao guiada ao corrigir categoria na UI deve ser refinada em fase futura.
- Sem OCR e sem envio automatico para IA externa.

## Fase 3.0 - uso real pelo Brain

Comandos esperados no chat/Brain:

- `Jarvis, quanto entrou esse mes?`
- `Jarvis, quanto saiu esse mes?`
- `Jarvis, qual meu saldo total?`
- `Jarvis, o que esta sem categoria?`
- `Jarvis, conferir duplicatas`
- `Jarvis, resumo financeiro do mes`

O FinanceAgent deve consultar dados internos antes de responder, manter ressalvas quando faltarem dados e nunca enviar extratos sensiveis para IA externa sem consentimento explicito.
