param([switch]$ValidateOnly)

$ErrorActionPreference = "Stop"
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$containerName = "jarvis-agent-sync-postgres-test"
$docker = Get-Command docker.exe -ErrorAction Stop
$gitExecutable = $env:JARVIS_AGENT_SYNC_GIT_EXECUTABLE
if ([string]::IsNullOrWhiteSpace($gitExecutable) -or -not (Test-Path -LiteralPath $gitExecutable -PathType Leaf)) {
    $gitCommand = Get-Command git.exe -ErrorAction SilentlyContinue
    if ($gitCommand) { $gitExecutable = $gitCommand.Source }
}
if ([string]::IsNullOrWhiteSpace($gitExecutable) -or -not (Test-Path -LiteralPath $gitExecutable -PathType Leaf)) {
    $gitCandidates = @(
        'D:\Git\bin\git.exe',
        (Join-Path $env:ProgramFiles 'Git\bin\git.exe'),
        (Join-Path $env:ProgramFiles 'Git\cmd\git.exe')
    )
    $gitExecutable = $gitCandidates | Where-Object { $_ -and (Test-Path -LiteralPath $_ -PathType Leaf) } | Select-Object -First 1
}
if ([string]::IsNullOrWhiteSpace($gitExecutable)) { throw 'Git não encontrado. Configure JARVIS_AGENT_SYNC_GIT_EXECUTABLE ou instale o Git for Windows.' }
$nodeExecutable = (Get-Command node.exe -ErrorAction SilentlyContinue).Source
if ([string]::IsNullOrWhiteSpace($nodeExecutable)) {
    $nodeCandidates = @((Join-Path $env:ProgramFiles 'nodejs\node.exe'), 'C:\Program Files\nodejs\node.exe')
    $nodeExecutable = $nodeCandidates | Where-Object { Test-Path -LiteralPath $_ -PathType Leaf } | Select-Object -First 1
}
if ([string]::IsNullOrWhiteSpace($nodeExecutable)) { throw 'Node.js não encontrado como node.exe.' }
$npmCliPath = $env:JARVIS_AGENT_SYNC_NPM_CLI
if ([string]::IsNullOrWhiteSpace($npmCliPath) -or -not (Test-Path -LiteralPath $npmCliPath -PathType Leaf)) { $npmCliPath = $env:npm_execpath }
if ([string]::IsNullOrWhiteSpace($npmCliPath) -or -not (Test-Path -LiteralPath $npmCliPath -PathType Leaf)) {
    $npmCommand = Get-Command npm.cmd -ErrorAction SilentlyContinue
    if ($npmCommand) { $npmCliPath = Join-Path (Split-Path -Parent $npmCommand.Source) 'node_modules\npm\bin\npm-cli.js' }
}
if ([string]::IsNullOrWhiteSpace($npmCliPath) -or -not (Test-Path -LiteralPath $npmCliPath -PathType Leaf)) {
    $npmCandidates = @((Join-Path (Split-Path -Parent $nodeExecutable) 'node_modules\npm\bin\npm-cli.js'), (Join-Path $env:ProgramFiles 'nodejs\node_modules\npm\bin\npm-cli.js'))
    $npmCliPath = $npmCandidates | Where-Object { Test-Path -LiteralPath $_ -PathType Leaf } | Select-Object -First 1
}
if ([string]::IsNullOrWhiteSpace($npmCliPath) -or -not (Test-Path -LiteralPath $npmCliPath -PathType Leaf)) { throw 'npm-cli.js não encontrado; nenhuma validação foi iniciada.' }
$originalPath = $env:PATH
$originalGitExecutable = $env:JARVIS_AGENT_SYNC_GIT_EXECUTABLE
$originalCodexCliPath = $env:CODEX_CLI_PATH
$originalNpmCliPath = $env:JARVIS_AGENT_SYNC_NPM_CLI
$testUrl = $null
$secretPointer = [IntPtr]::Zero

try {
    Set-Location -LiteralPath $repoRoot
    $gitDirectory = Split-Path -Parent $gitExecutable
    $env:PATH = "$gitDirectory;$originalPath"
    $env:JARVIS_AGENT_SYNC_GIT_EXECUTABLE = $gitExecutable
    $env:JARVIS_AGENT_SYNC_NPM_CLI = $npmCliPath
    $gitVersion = & $gitExecutable --version
    if ($LASTEXITCODE -ne 0) { throw "O Git não respondeu no PowerShell." }
    $nodeGitCheck = & $nodeExecutable -e "const {spawnSync}=require('node:child_process');const r=spawnSync(process.env.JARVIS_AGENT_SYNC_GIT_EXECUTABLE,['--version'],{encoding:'utf8'});if(r.error||r.status!==0)process.exit(1);process.stdout.write(r.stdout.trim())"
    if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($nodeGitCheck)) { throw "Node.js não conseguiu iniciar o Git resolvido pelo runner." }
    Write-Output "Git resolvido para esta execução: $gitVersion; Node spawn: OK."

    $codexExecutable = $env:CODEX_CLI_PATH
    if ([string]::IsNullOrWhiteSpace($codexExecutable) -or -not (Test-Path -LiteralPath $codexExecutable -PathType Leaf)) {
        $codexCommand = Get-Command codex.exe -ErrorAction SilentlyContinue
        if ($codexCommand) { $codexExecutable = $codexCommand.Source }
    }
    if ([string]::IsNullOrWhiteSpace($codexExecutable) -or -not (Test-Path -LiteralPath $codexExecutable -PathType Leaf)) {
        $codexBinRoot = Join-Path $env:LOCALAPPDATA 'OpenAI\Codex\bin'
        if (Test-Path -LiteralPath $codexBinRoot -PathType Container) {
            $codexExecutable = Get-ChildItem -LiteralPath $codexBinRoot -Directory -ErrorAction SilentlyContinue |
                Sort-Object LastWriteTime -Descending |
                ForEach-Object { Join-Path $_.FullName 'codex.exe' } |
                Where-Object { Test-Path -LiteralPath $_ -PathType Leaf } |
                Select-Object -First 1
        }
    }
    if ([string]::IsNullOrWhiteSpace($codexExecutable) -or -not (Test-Path -LiteralPath $codexExecutable -PathType Leaf)) {
        $npmCodex = Join-Path $env:APPDATA 'npm\node_modules\@openai\codex\bin\codex.exe'
        if (Test-Path -LiteralPath $npmCodex -PathType Leaf) { $codexExecutable = $npmCodex }
    }
    if ([string]::IsNullOrWhiteSpace($codexExecutable) -or -not (Test-Path -LiteralPath $codexExecutable -PathType Leaf) -or [IO.Path]::GetExtension($codexExecutable) -notin @('.exe', '.com')) {
        throw 'Codex CLI não encontrado como executável direto. Configure CODEX_CLI_PATH para codex.exe/.com; shims .cmd/.ps1 não são seguros para o spawn do Agent Sync.'
    }
    $env:CODEX_CLI_PATH = $codexExecutable

    $containerState = & $docker.Source inspect --format '{{.State.Status}}|{{if .State.Health}}{{.State.Health.Status}}{{end}}' $containerName 2>$null
    if ($LASTEXITCODE -ne 0 -or $containerState.Trim() -ne "running|healthy") {
        throw "O PostgreSQL descartável do Agent Sync não está saudável."
    }

    & $docker.Source exec $containerName sh -lc 'pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB"' *> $null
    if ($LASTEXITCODE -ne 0) { throw "O PostgreSQL de teste não aceitou conexões." }

    $containerEnvironment = & $docker.Source inspect --format '{{range .Config.Env}}{{println .}}{{end}}' $containerName
    $databaseUser = $null
    $databasePassword = $null
    $databaseName = $null
    foreach ($entry in $containerEnvironment) {
        if ($entry.StartsWith("POSTGRES_USER=")) { $databaseUser = $entry.Substring(14) }
        elseif ($entry.StartsWith("POSTGRES_PASSWORD=")) { $databasePassword = $entry.Substring(18) }
        elseif ($entry.StartsWith("POSTGRES_DB=")) { $databaseName = $entry.Substring(12) }
    }
    if (-not $databaseUser -or -not $databasePassword -or $databaseName -ne "jarvis_agent_sync_test") {
        throw "Configuração do container de teste inválida."
    }
    $testUrl = "postgresql://$([uri]::EscapeDataString($databaseUser)):$([uri]::EscapeDataString($databasePassword))@127.0.0.1:55433/$databaseName"
    $env:JARVIS_AGENT_SYNC_TEST_DATABASE_URL = $testUrl
    Remove-Variable containerEnvironment,databaseUser,databasePassword,databaseName -ErrorAction SilentlyContinue

    & $nodeExecutable $npmCliPath ci --prefix tools/agent-sync --no-audit --no-fund
    if ($LASTEXITCODE -ne 0) { throw "Falha ao instalar dependências do Agent Sync." }
    & $nodeExecutable $npmCliPath run validate --prefix tools/agent-sync
    if ($LASTEXITCODE -ne 0) { throw "A validação do Agent Sync falhou." }
    & $nodeExecutable $npmCliPath run validate-local --prefix tools/agent-sync
    if ($LASTEXITCODE -ne 0) { throw "As validações locais com PostgreSQL descartável falharam." }
    $dryRunOutput = & $nodeExecutable $npmCliPath run dry-run --prefix tools/agent-sync
    $dryRunOutput | Write-Output
    if ($LASTEXITCODE -ne 0) { throw "O dry-run do Agent Sync falhou." }
    $dryRunText = $dryRunOutput -join "`n"
    if ($dryRunText -notmatch '"codexCliAvailable"\s*:\s*true' -or $dryRunText -notmatch '"codexCliAuthenticated"\s*:\s*true') {
        throw "O dry-run não confirmou a mesma CLI Codex autenticada que o ciclo utilizará."
    }
    Write-Output "Codex CLI: executável resolvido e autenticado pelo mesmo teste do dry-run."

    if ($ValidateOnly) {
        Write-Output "Pré-validação concluída; nenhum ciclo de modelo foi iniciado."
        return
    }

    $gitChanges = & git status --porcelain
    if ($LASTEXITCODE -ne 0 -or $gitChanges) {
        throw "O worktree precisa estar limpo antes do ciclo. Revise e faça um checkpoint local das alterações."
    }

    if ([string]::IsNullOrWhiteSpace($env:OPENAI_API_KEY)) {
        $secureKey = Read-Host "Cole sua NOVA chave OpenAI" -AsSecureString
        $secretPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureKey)
        $env:OPENAI_API_KEY = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($secretPointer)
    }
    if ([string]::IsNullOrWhiteSpace($env:OPENAI_API_KEY)) { throw "OPENAI_API_KEY não configurada." }

    $env:JARVIS_AGENT_SYNC_MAX_CYCLES = "1"
    & $nodeExecutable $npmCliPath run cycle --prefix tools/agent-sync
    if ($LASTEXITCODE -ne 0) { throw "O ciclo supervisionado terminou com falha; consulte apenas o resumo sanitizado acima." }
} catch {
    Write-Error $_.Exception.Message
    exit 1
} finally {
    if ($secretPointer -ne [IntPtr]::Zero) {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($secretPointer)
    }
    Remove-Item Env:JARVIS_AGENT_SYNC_TEST_DATABASE_URL -ErrorAction SilentlyContinue
    Remove-Item Env:JARVIS_AGENT_SYNC_MAX_CYCLES -ErrorAction SilentlyContinue
    Remove-Item Env:OPENAI_API_KEY -ErrorAction SilentlyContinue
    if ($null -eq $originalPath) { Remove-Item Env:PATH -ErrorAction SilentlyContinue } else { $env:PATH = $originalPath }
    if ($null -eq $originalGitExecutable) { Remove-Item Env:JARVIS_AGENT_SYNC_GIT_EXECUTABLE -ErrorAction SilentlyContinue } else { $env:JARVIS_AGENT_SYNC_GIT_EXECUTABLE = $originalGitExecutable }
    if ($null -eq $originalCodexCliPath) { Remove-Item Env:CODEX_CLI_PATH -ErrorAction SilentlyContinue } else { $env:CODEX_CLI_PATH = $originalCodexCliPath }
    if ($null -eq $originalNpmCliPath) { Remove-Item Env:JARVIS_AGENT_SYNC_NPM_CLI -ErrorAction SilentlyContinue } else { $env:JARVIS_AGENT_SYNC_NPM_CLI = $originalNpmCliPath }
}
