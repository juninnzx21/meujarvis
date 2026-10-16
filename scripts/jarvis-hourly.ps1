param(
    [switch]$DryRun,
    [switch]$Execute
)

$ErrorActionPreference = 'Stop'
$repo = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$required = @(
    'JARVIS_MASTER_PLAN.md', 'JARVIS_PROGRESS.md',
    'docs/jarvis/STATE.json', 'docs/jarvis/RUNBOOK.md',
    'docs/jarvis/DECISIONS.md', 'docs/jarvis/TEST_EVIDENCE.md',
    'docs/jarvis/SECURITY_REGISTER.md', 'docs/jarvis/CHANGELOG_IMPLEMENTATION.md'
)
$statePath = Join-Path $repo 'docs/jarvis/STATE.json'
$state = Get-Content $statePath -Raw | ConvertFrom-Json
$missing = @($required | Where-Object { -not (Test-Path (Join-Path $repo $_)) })
if ($missing.Count) { throw "BLOCKED: arquivos obrigatórios ausentes: $($missing -join ', ')" }
if (-not $DryRun -and -not $Execute) { $DryRun = $true }
if ($DryRun -and $Execute) { throw 'Use DryRun ou Execute, não ambos.' }

$lockDir = Join-Path $env:LOCALAPPDATA 'JARVIS/CodexAutomation'
[System.IO.Directory]::CreateDirectory($lockDir) | Out-Null
$lockPath = Join-Path $lockDir 'run.lock'
if (Test-Path $lockPath) {
    $existing = Get-Content $lockPath -Raw | ConvertFrom-Json
    $expiry = [DateTime]::Parse($existing.expiresUtc).ToUniversalTime()
    if ($expiry -gt [DateTime]::UtcNow) {
        Write-Output "SKIPPED_LOCKED runId=$($existing.runId) expiresUtc=$($existing.expiresUtc)"
        exit 0
    }
    throw "BLOCKED: lock expirado encontrado ($($existing.runId)); verifique PID/processo e arquive manualmente antes de retomar."
}

$runId = [Guid]::NewGuid().ToString()
$lockJson = [ordered]@{
    runId = $runId
    pid = $PID
    startedUtc = [DateTime]::UtcNow.ToString('o')
    expiresUtc = [DateTime]::UtcNow.AddMinutes(90).ToString('o')
    repo = $repo
} | ConvertTo-Json -Compress
$stream = $null
try {
    $stream = [System.IO.File]::Open($lockPath, [System.IO.FileMode]::CreateNew, [System.IO.FileAccess]::Write, [System.IO.FileShare]::None)
    $bytes = [Text.Encoding]::UTF8.GetBytes($lockJson)
    $stream.Write($bytes, 0, $bytes.Length)
    $stream.Dispose(); $stream = $null

    Push-Location $repo
    try {
        $branch = (& git branch --show-current).Trim()
        $sha = (& git rev-parse HEAD).Trim()
        $status = @(& git status --short)
        if ($LASTEXITCODE -ne 0) { throw 'Não foi possível ler o estado Git.' }
        $statusJson = $status | ConvertTo-Json -Compress
        $validJson = $null
        try { $validJson = Get-Content $statePath -Raw | ConvertFrom-Json } catch { throw 'STATE.json inválido.' }

        if ($DryRun) {
            [pscustomobject]@{
                result = 'DRY_RUN_OK'
                runId = $runId
                repo = $repo
                branch = $branch
                sha = $sha
                gitStatus = $statusJson
                nextTaskId = $validJson.nextTaskId
                schedulerEnabled = [bool]$validJson.scheduler.enabled
                executionEnabled = [bool]$validJson.scheduler.executionEnabled
                appCodeChanged = $false
                productionTouched = $false
            } | ConvertTo-Json -Depth 5
            exit 0
        }

        if (-not $Execute) { throw 'Execução não foi explicitamente selecionada.' }
        if (-not $validJson.scheduler.enabled -or -not $validJson.scheduler.executionEnabled) {
            throw 'BLOCKED: estado do agendador continua desabilitado; dry-run/manual supervisionado e autorização são gates obrigatórios.'
        }
        if ($branch -ne $validJson.checkpoint.branch) { throw "BLOCKED: branch inesperada: $branch" }
        if ($status.Count -gt 0) { throw 'BLOCKED: working tree não está limpo; preserve alterações e reconcilie antes de executar.' }

        $codex = Get-Command codex -ErrorAction Stop
        $prompt = @"
Continue a execução do JARVIS exclusivamente neste repositório: $repo
Antes de qualquer ação, leia integralmente JARVIS_MASTER_PLAN.md, JARVIS_PROGRESS.md, docs/jarvis/STATE.json, RUNBOOK.md, DECISIONS.md, TEST_EVIDENCE.md, SECURITY_REGISTER.md, CHANGELOG_IMPLEMENTATION.md e as 12 auditorias originais.
Confira branch, SHA, Git, bloqueios, risco e tarefa elegível. Faça UMA tarefa pequena, somente em branch de trabalho e no escopo do JARVIS. Preserve todas as alterações existentes e outros sistemas.
Não faça deploy, restart, migration, alteração de host/VPS/firewall/SSH/DNS, envio a terceiros, remoção de dados ou acesso a segredos. Nunca use bypass de sandbox/aprovações. Se a tarefa exigir aprovação, staging/credencial ausente, source divergence, working tree modificado ou revisão humana, registre BLOCKED e pare sem código.
Atualize progresso append-only e STATE atomicamente; testes isolados; nenhum push/merge. Se testes não passarem, não declare concluído.
"@
        # A execução automática só será habilitada após gates humanos; ainda conserva sandbox e fluxo padrão de aprovação.
        $prompt | & $codex.Source exec --sandbox workspace-write -C $repo -
        $exitCode = $LASTEXITCODE
        if ($exitCode -ne 0) { throw "Codex terminou com código $exitCode; verifique a sessão local. Nenhum deploy foi solicitado." }
        Write-Output "EXECUTION_COMPLETED runId=$runId branch=$branch shaBefore=$sha"
    }
    finally { Pop-Location }
}
finally {
    if ($stream) { $stream.Dispose() }
    if (Test-Path $lockPath) {
        try {
            $held = Get-Content $lockPath -Raw | ConvertFrom-Json
            if ($held.runId -eq $runId) { Remove-Item -LiteralPath $lockPath -Force }
        } catch { Write-Warning 'Não foi possível liberar lock; verifique owner/runId manualmente.' }
    }
}
