# NVIDIA-001 — política persistente de gasto zero

## Decisão do proprietário

O orçamento mensal NVIDIA é **R$ 0,00**. Nenhuma cobrança é autorizada. Crédito gratuito só poderá ser usado depois de prova verificável de que a conta, o modelo e a operação específicos não podem gerar cobrança. Saldo, preço, quota ou entitlement ausentes/desconhecidos resultam em bloqueio. Não se faz chamada paga para descobrir se há crédito.

## Implementação local

- `NVIDIA_ZERO_SPEND` é persistida por usuário em `Setting` como parte da transação que salva os parâmetros NVIDIA; a chave de API continua criptografada separadamente.
- O registro cobre provedor, modelo/endpoints, operações LLM/STT/TTS, budget R$ 0,00 e período de mês-calendário no fuso `America/Sao_Paulo`.
- A política é imutável nesta versão: requisições pagas, fallback automático para provedor pago e top-up automático são falsos; informação desconhecida de preço, quota ou entitlement resulta em `BLOCK`.
- Chat NIM, endpoint de teste, teste de saúde STT, transcrição e Magpie TTS não enviam requisições. Bloqueios são registrados sem segredo, texto ou áudio, com usuário, modelo/operação e período.
- Quando NVIDIA é a IA principal, só Ollama local pode ser fallback. STT NVIDIA não faz fallback automático para OpenAI. NVIDIA não participa do fallback remoto TTS; se for a preferência remota, só o Piper local é tentado.
- Outros provedores mantêm suas configurações e rotas próprias. A política de gasto zero da NVIDIA não muda chaves nem contratos dos demais provedores.

## Evidência NVIDIA e limites

Foram consultadas as páginas oficiais da [API LLM NIM](https://docs.nvidia.com/nim/large-language-models/latest/api-reference.html), do [acesso ao API Catalog](https://docs.nvidia.com/nim/large-language-models/latest/getting-started.html) e da [API NVCF](https://docs.nvidia.com/nvcf/dev/overview/api). Elas documentam autenticação e endpoints de invocação/gestão; não fornecem evidência de que a conta específica, cada modelo e cada inferência sejam gratuitos, nem comprovam um teto de cobrança da conta. Não foi encontrado no material consultado um sinal confiável que permita liberar uma chamada real sem risco financeiro. Esta conclusão é limitada às fontes consultadas; nenhuma API de billing/quota da conta foi chamada.

## Validação

`run-cycle.ps1 -ValidateOnly` na worktree local: identidade SQL/Docker e migrations PASS; backend **177/177**, frontend **49/49**, Agent Sync **17/17**, zero skips; typechecks/builds, dry-run e `git diff --check` PASS. A regressão PostgreSQL comprova que a política zero-spend é persistida na mesma transação que as configurações e que os caminhos LLM/STT/TTS/teste não fazem POST remoto mesmo com chave/modelo sintéticos. Nenhuma chave real, API NVIDIA, VPS, produção ou scheduler foi usada.

## Estado

`NVIDIA-001` segue `IN_PROGRESS`: a proteção de gasto zero foi implementada localmente, mas disponibilidade real da conta/modelo, eventual gratuidade e preço continuam sem prova. Todos os pedidos de inferência/voz continuam bloqueados. O texto original recebido terminava no início da seção 4 (“Controle persistente”), então campos além dos descritos no texto completo disponível não foram presumidos.
