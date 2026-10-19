import {
  assertSettingsRotationTargetDisposable,
  rotateAllSecretSettings
} from "../src/services/settingsRotationService.js";
import { parseSettingsRotationArgs } from "../src/services/settingsRotationCliArgs.js";
import { logger } from "../src/utils/logger.js";

const parsedArgs = parseSettingsRotationArgs(process.argv.slice(2));
if (!parsedArgs.success) {
  process.stderr.write("[settings:rotate] Uso: npm run settings:rotate [-- --dry-run]\n");
  process.exit(2);
}

const isDryRun = parsedArgs.dryRun;

async function main() {
  try {
    await assertSettingsRotationTargetDisposable();
  } catch {
    process.stderr.write("[settings:rotate] Bloqueado: não foi possível comprovar o container PostgreSQL descartável e a identidade SQL. Nenhuma rotação foi iniciada.\n");
    process.exitCode = 2;
    return;
  }

  process.stdout.write(
    `[settings:rotate] Iniciando rotação de criptografia de configurações... (modo: ${isDryRun ? "DRY-RUN (somente leitura)" : "EXECUÇÃO ATÔMICA"})\n`
  );

  const result = await rotateAllSecretSettings({ dryRun: isDryRun });

  process.stdout.write(
    `[settings:rotate] Concluído!\n` +
    `  - Total de configurações secretas encontradas: ${result.totalFound}\n` +
    `  - Configurações rotacionadas para v2: ${result.rotated}\n` +
    `  - Configurações já atualizadas na chave/versão atual: ${result.alreadyCurrent}\n`
  );

  if (result.backupFile) {
    process.stdout.write(`  - Arquivo de backup prévio gravado: ${result.backupFile}\n`);
  }

  if (isDryRun && result.rotated > 0) {
    process.stdout.write("\nPara aplicar as alterações reais no banco de dados, execute novamente sem a flag --dry-run.\n");
  }
}

main().catch((error: unknown) => {
  logger.error(
    { errorType: error instanceof Error ? error.name : "UnknownError" },
    "Falha na rotação de settings; detalhes sensíveis foram omitidos"
  );
  process.stderr.write("[settings:rotate] Falha; confira a configuração e o banco de teste sem compartilhar valores de segredos.\n");
  process.exit(1);
});
