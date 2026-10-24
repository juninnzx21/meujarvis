# JARVIS — consolidação do código e preservação de dados

**Atualização:** 2026-10-16. **Estado:** auditoria concluída; consolidação, limpeza e deploy não executados.

O repositório público oficial para o código versionado é `https://github.com/juninnzx21/meujarvis`. Este documento registra somente decisões de desenvolvimento; caminhos operacionais, hostnames, tamanhos de backup, nomes de containers, hashes de arquivos privados e inventários de outros produtos ficam fora do repositório.

## Estratégia de branches

- `main` (`ee4f987`) permanece referência de integração e revisão.
- `codex/jarvis-2.0-platform-20261015` (`eec24a6`) é candidata à base de produto v2.0.0: 35 commits à frente de `main`, sem commits exclusivos de `main` na comparação observada. PR #1 continua aberto; não mesclar sem decisão humana.
- `codex/sec-001-004-webhook-media-20261016` descende da plataforma e estava 6 commits à frente no head remoto `113fb59`. O checkout local contém commits documentais operacionais não publicados e não deve ser enviado ao repositório público.
- Esta auditoria usa uma branch isolada limpa, baseada no head remoto de segurança. SEC-001/004 seguem em revisão até E2E autenticado com Evolution em staging.

A proposta é adotar a branch de plataforma como candidata a base, revisar PR #1, validar SEC-001/004 em staging e só então escolher a branch canônica. Não copiar conteúdo de dumps, configurações, bancos, dados de usuário ou artefatos operacionais para o Git.

## Cópias e dados

Foram comparados manifestos de código entre as cópias locais e branches Git. As cópias têm alterações divergentes; nenhuma é substituta integral da outra. Há worktrees com mudanças locais que devem ser revisadas individualmente antes de integração. A comparação completa e os caminhos ficam no relatório local privado de auditoria; nenhum hash/caminho de arquivos operacionais está publicado aqui.

Dados de runtime, segredos, bancos, modelos, releases assinadas e backups permanecem separados do repositório. A auditoria de staging multi-sistema encontrou sobreposição confirmada apenas para um conjunto limitado de código/documentação. Duplicidade não é motivo suficiente para apagar arquivos dentro de backups ou payloads.

## Gates para próxima consolidação

1. Revisar PR #1 e confirmar base de produto.
2. Revisar e integrar alterações locais em ambiente descartável; não sobrescrever as cópias originais.
3. Obter E2E Evolution em staging isolado para SEC-001/004.
4. Fazer backup consistente e provar restauração isolada antes de qualquer retenção ou migração de dados.
5. Requerer avaliação e autorização separadas para backups, volumes, imagens, releases, arquivos de usuário ou caches compartilhados.
6. Manter agendamento horário pausado e deploy manual/supervisionado.

Nenhuma branch foi mesclada/regravada, nenhuma cópia foi removida e nenhuma alteração foi implantada.
