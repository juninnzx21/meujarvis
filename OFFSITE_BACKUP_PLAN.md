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
