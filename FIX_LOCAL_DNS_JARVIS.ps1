# Execute este script em PowerShell "Executar como Administrador".
# Ele troca o DNS do adaptador Ethernet para Cloudflare/Google e limpa o cache local.

$ErrorActionPreference = "Stop"

Write-Host "Configurando DNS publico no adaptador Ethernet..." -ForegroundColor Cyan
Set-DnsClientServerAddress -InterfaceAlias "Ethernet" -ServerAddresses @("1.1.1.1", "8.8.8.8")

Write-Host "Limpando cache DNS..." -ForegroundColor Cyan
Clear-DnsClientCache
ipconfig /flushdns | Out-Host

Write-Host "Validando resolucao..." -ForegroundColor Cyan
Resolve-DnsName jarvis.juninnzxtec.com.br -Type A | Format-Table -AutoSize
Resolve-DnsName apijarvis.juninnzxtec.com.br -Type A | Format-Table -AutoSize

Write-Host ""
Write-Host "Resultado esperado:" -ForegroundColor Green
Write-Host "- jarvis.juninnzxtec.com.br     -> 166.0.186.20  (frontend Fabweb)" -ForegroundColor Green
Write-Host "- apijarvis.juninnzxtec.com.br  -> 45.76.251.177 (API VPS)" -ForegroundColor Green
Write-Host "Depois feche e abra o Chrome novamente." -ForegroundColor Green
Write-Host "URL: https://jarvis.juninnzxtec.com.br/?v=novo" -ForegroundColor Green
