# Roadmap de Melhorias do JARVIS Home AI

Data: 2026-05-16

Status atual: **APROVADO COM RESSALVAS**

Decisao atual: oficializar `https://apijarvis.juninnzxtec.com.br/api` como API publica. Corrigir `/api/*` no dominio principal vira opcional, nao bloqueante, enquanto o frontend estiver servido separadamente.

Diagnosticos de IA foram refinados para separar chave ausente, chave invalida, quota, modelo inexistente, erro de rede e erro generico. Pendencias de OpenAI/Gemini em producao continuam dependentes de ajuste externo quando o health indicar quota/chave/modelo.

Auditoria final 2026-05-16 16:18: backend/frontend, Prisma, scripts, backup, PWA e API dedicada foram validados. O Docker Desktop estava inicialmente parado, mas foi iniciado com seguranca; o PostgreSQL foi recriado sem apagar volume e ficou healthy em `127.0.0.1:5432`.

Operacao 2026-05-16 16:29: proximo deploy documentado em `DEPLOY_NEXT_STEPS.md`; prioridade imediata e aplicar `git pull origin main` na VPS, rebuildar backend, publicar `frontend/dist` na Fabweb com `VITE_API_URL=https://apijarvis.juninnzxtec.com.br/api` e configurar Evolution API no painel.

Fase 10 implementa a fundacao 100000/10, mas pgvector real, RAG com embeddings externos, deploy de n8n em subdominio, E2E Playwright completo e credenciais reais seguem como evolucoes com ressalva operacional.

## Prioridade critica

1. Rotacionar todos os segredos ja compartilhados fora do repositorio.
   - Impacto: altissimo.
   - Pre-requisito: acesso aos provedores.
   - Inclui VPS, DirectAdmin, banco, OpenAI, Gemini, Evolution, Home Assistant, n8n, GitHub e webhooks.

2. Oficializar/corrigir roteamento de API.
   - Impacto: alto.
   - Opcao A: documentar `https://apijarvis.juninnzxtec.com.br/api` como API publica definitiva.
   - Opcao B: corrigir Caddy para `https://jarvis.juninnzxtec.com.br/api/*` apontar para backend.

3. Monitorar IA externa em producao.
   - Impacto: alto.
   - OpenAI e Gemini retornaram `configured` na validacao atual.
   - Manter alertas para `invalid_key`, `quota_exceeded`, `model_not_found`, `network_error` e `api_error`.

4. Configurar WhatsApp/Evolution em producao.
   - Impacto: alto para uso diario.
   - Necessario para receber mensagens, audios e extratos via WhatsApp.
   - Manter `WHATSAPP_AUTO_REPLY=false` por padrao e frase obrigatoria `ei jarvis`.

5. Preservar bind seguro do PostgreSQL.
   - Impacto: alto.
   - Auditoria final mostrou PostgreSQL healthy em `127.0.0.1:5432`.
   - Manter esse padrao e evitar publicar banco em `0.0.0.0`.
   - Em VPS/producao, manter banco apenas em rede Docker/local, nunca publico.

## Prioridade importante

6. Configurar n8n real.
   - Criar webhook seguro.
   - Testar payloads `task.created`, `routine.run`, `backup.completed`, `system.alert`.
   - Registrar logs redigidos.

7. Configurar Home Assistant real.
   - Validar URL/token.
   - Listar entidades.
   - Liberar apenas acoes seguras sem confirmacao.
   - Exigir confirmacao para lock/alarm/cover/garage/portao.

8. Tratar warnings de transcricao de audio WhatsApp.
   - Health full mostrou warnings recentes.
   - Validar formato de midia recebido, download da Evolution API e provedor de transcricao.

9. Investigar historico de `scheduler tick_error`.
   - Health atual mostra scheduler rodando sem `lastError`, mas logs recentes mostram erros anteriores.
   - Melhorar alerta e painel de diagnostico.

10. Criar E2E real com Playwright.
   - Cobrir login, dashboard, chat, tarefas, financeiro, notificacoes, WhatsApp mock e responsividade.

## Prioridade futura

11. Implementar pgvector/memoria semantica real.
    - Melhorar busca de memorias e contexto do chat.

12. Streaming token a token real.
    - Melhorar UX do chat.

13. Push notifications.
    - Alertas reais para tarefas vencidas, backup, falha de integracao e scheduler.

14. App mobile/PWA avancado.
    - Facilitar uso diario por celular.

15. Multiusuario e permissoes comerciais.
    - Roles refinadas, auditoria por usuario, trilhas de acesso e politicas de privacidade.

16. Backup offsite automatizado.
    - S3/Drive/outro VPS com criptografia, retencao e teste de restore em ambiente separado.

17. Monitoramento externo.
    - Uptime, health, certificado HTTPS, scheduler, banco e alertas.

18. Observabilidade avancada.
    - Metricas, dashboards, tracing simples e alertas por severidade.

19. Politica LGPD/privacidade.
    - Essencial para uso comercial.

20. CI/CD.
    - GitHub Actions com test/validate/build e varredura de segredos.

## Ordem recomendada por fase

### Fase 8.1 - Correcao operacional imediata

- Rotacionar segredos.
- Definir API oficial.
- Monitorar OpenAI/Gemini e validar modelos/quota.
- Confirmar CORS e dominios.
- Revalidar producao.

### Fase 8.2 - WhatsApp real

- Configurar Evolution.
- Validar instancia.
- Testar texto com `ei jarvis`.
- Testar audio.
- Testar extrato OFX/CSV.
- Garantir logs redigidos.

### Fase 8.3 - Financeiro real

- Validar conta PJ DO INTER.
- Importar extratos reais em ambiente controlado.
- Revisar duplicatas.
- Criar regras de categorias.
- Conectar, se necessario, ao sistema `controlefinanceiro`.

### Fase 8.4 - Producao comercial

- SSH por chave.
- Firewall.
- Backup offsite.
- Monitoramento externo.
- E2E Playwright.
- Politicas de privacidade e retencao.

## Resultado esperado

Com essas melhorias, o JARVIS passa de assistente pessoal funcional para uma base mais confiavel para uso diario real. Para uso comercial, ainda precisa hardening operacional, privacidade, E2E, monitoramento, backups externos e governanca de usuarios.

# Atualizacao - Central de Integracoes

Prioridade imediata:

1. Deploy do commit da Central na VPS.
2. Configurar DNS/Caddy do `n8njarvis.juninnzxtec.com.br`.
3. Preencher credenciais reais pelo painel `/settings/integrations`.
4. Testar Evolution API via `/integrations/setup-wizard`.
5. Validar WhatsApp real com `ei jarvis status do sistema`.

Prioridade seguinte:

- Automatizar importacao real dos workflows via API do n8n quando a API key estiver disponivel.
- Adicionar Playwright para o wizard completo.
- Monitoramento externo com alertas via n8n.
