# Registro de segurança

Escala: P0 = risco crítico/incidente confirmado; P1 = alto e priorizado; P2 = moderado; P3 = melhoria. “Código confirmado” não implica exploração nem presença na produção.

| ID | Prioridade | Status | Evidência / impacto | Mitigação e responsável | Reabertura/aceite |
|---|---|---|---|---|---|
| SEC-001 | P1 | IN_REVIEW, sem deploy | Branch `codex/sec-001-004-webhook-media-20261016`: segredo aleatório criptografado e validado constant-time, instância/evento/ID/remetente allowlisted, rate limit 60/min e ID externo único para replay; migration pendente | Validar PostgreSQL descartável e payload Evolution real em staging; nenhum deploy | Unit tests negativos passaram; integração DB e status live não verificados |
| SEC-004 | P1 | IN_REVIEW, sem deploy | Branch remove fetches das URLs de anexo/áudio fornecidas pelo evento; somente base64 inline até 8 MiB, sem enviar chave Evolution para URL externa | Validar mídia base64 em staging e avaliar recuperação autenticada/allowlisted sem URL arbitrária | Testes mockados de não-fetch e base64 passaram; Evolution real e DB não testados |
| SEC-002 | P1 | TODO | `SETTINGS_ENCRYPTION_KEY || JWT_SECRET`; rotação JWT pode quebrar acesso a settings criptografados | Backend: chave separada obrigatória, versionar, backup e re-encriptar | Roundtrip antes/depois de rotação em DB descartável, sem perda de dados |
| SEC-003 | P1 condicional | BLOCKED | Compose raiz inclui credencial PostgreSQL estática; produção efetivamente usa este arquivo é desconhecido | Operações: ler config ativa com segredo redigido; retirar defaults, restringir bind, validar fail-closed | Evidência do Compose em produção sem valores de exemplo e sem exposição |
| AUTH-001 | P1 | TODO | bcrypt/JWT existem; não identificada cobertura completa de MFA/reset verificado/revogação | Backend: MFA admin, reset token único, revogação e rate limit | Testes DB isolados para login/2FA/reset/expiração/revogação |
| INT-001 | P1 | TODO | Status de sessão Evolution real não acessível; health do JARVIS não basta | QA: sessão/test number em staging, sem envio a terceiros | Receber/sair mensagem de teste autorizada, correlation ID, estado coerente |
| BASE-001 | P1 | BLOCKED | `origin/main` diverge e elimina componentes; risco de perder funcionalidades | Maintainer: revisão independente commits/diff antes de rebase/merge | Fonte-base escolhida e inventário de recursos aprovado |
| AUTO-001 | P1 | IN_PROGRESS | Executor não registrado no Codex para repo correto; cron não pode operar na raiz errada | Codex/ops: cadastrar projeto e validar runner/lock/sandbox | Dry-run + ciclo manual + timer ainda disabled até aprovação |
| OBS-001 | P2 | TODO | Status público é somente health simplificado; sem métricas host autenticadas | Ops: health por dependência, logs sanitizados, métricas e alertas | Teste de alerta/falha/recuperação sem falso positivo |
| MEM-001 | P2 | TODO | Isolamento lexical no código, suite DB não executada | Backend QA: casos cross-user, retention/exclusão | Nenhuma leitura cruzada; exclusão verificável |
| VOICE-001 | P2 | TODO | Mic/TTS físico e credenciais/quota não testados | QA cliente: browser/Windows/Android com dados de teste | Gravação de evidência por device e latência |

Nenhuma chave, senha, token ou configuração privada foi copiada para este registro. Correção local em branch não significa mitigação em produção; a versão/configuração ativa ainda não foi verificada.
