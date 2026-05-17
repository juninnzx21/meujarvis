# Plano de backup offsite

## Estado atual

O backup local e feito por `backup-jarvis.ps1`, usando `pg_dump` do PostgreSQL em container e salvando arquivos em `E:\jarvis-home-assistant\backups`.

Backups locais sao ignorados no Git e nunca devem ser enviados para IA ou repositores.

## Retencao recomendada

- Diario: manter 7 dias.
- Semanal: manter 4 semanas.
- Mensal: manter 6 meses.

## Destinos offsite possiveis

- S3 compativel com criptografia no cliente.
- Google Drive manual com arquivo criptografado.
- Outro VPS com `scp`/`rsync` por chave SSH.
- Cofre de backup gerenciado.

## n8n

Use `backup-n8n.ps1` para gerar backup local do banco do n8n em `backups/`. Para offsite, criptografe antes de enviar e nunca suba backups para o Git.

## Procedimento recomendado

1. Gerar backup local.
2. Criptografar arquivo antes de enviar para offsite.
3. Transferir para destino externo.
4. Registrar data, tamanho e hash.
5. Testar restore em ambiente separado, nunca direto na producao.

## Regras de seguranca

- Nunca commitar `.sql`, `.dump` ou `.backup`.
- Nunca anexar backup bruto em chat, ticket ou prompt.
- Nunca fazer restore em producao sem janela de manutencao e confirmacao explicita.
- Manter chave de criptografia em gerenciador de senhas/vault.

## Restore

O restore deve ser testado em ambiente separado:

```bash
createdb jarvis_restore_test
psql jarvis_restore_test < backup.sql
```

Em producao, use `restore-jarvis.ps1` apenas com confirmacao manual e backup recente.

## Fase 3.0 - preparo offsite criptografado

Status: **preparado / manual_action_required**.

O script `backup-offsite-jarvis.ps1` existe como base operacional. Ele nao deve enviar nada para fora sem destino externo e credencial explicitamente configurados pelo usuario.

Checklist para ativacao:

- escolher destino: S3 compativel, Google Drive/rclone, outro VPS ou cofre gerenciado;
- criar chave de criptografia fora do repositorio;
- gerar backup local com `backup-jarvis.ps1`;
- criptografar antes de transferir;
- registrar data, tamanho e checksum;
- testar restore somente em ambiente separado;
- manter retencao: diario 7 dias, semanal 4 semanas, mensal 6 meses.

Ressalva: offsite real depende de credencial/destino externo e deve permanecer `manual_action_required` ate configuracao segura.
