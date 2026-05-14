# Instrucoes para futuros agentes

- Use exclusivamente `E:\jarvis-home-assistant`.
- Mantenha TypeScript estrito e valide entradas com Zod.
- Nunca exponha segredos no frontend, em logs ou em respostas.
- Nao adicione comandos shell arbitrarios ou automacoes destrutivas.
- Integracoes sem credenciais devem retornar `not_configured` e continuar seguras.
- Preserve pt-BR na interface e nas respostas do JARVIS.
- Antes de entregar mudancas, rode `npm run validate` em backend e frontend.
- Quando alterar modulos, atualize README, ARCHITECTURE, SYSTEM_STATUS_REPORT e FINAL_VALIDATION_REPORT.
- Para acoes sensiveis de Home Assistant, WhatsApp e automacoes, exija confirmacao explicita.
- Se `prisma generate` falhar com `EPERM` no Windows, encerre processos Node do projeto e rode novamente.
- Nunca mostre valores de `.env`; relate apenas se uma variavel esta configurada ou ausente.
- Ao testar integracoes reais, use endpoints de teste seguros e confirme que logs redigiram request/response.
- Scheduler deve permanecer seguro: sem shell, sem WhatsApp automatico, sem envio em massa e sem Home Assistant sensivel sem confirmacao.
