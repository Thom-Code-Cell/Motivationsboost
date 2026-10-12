$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
$env:OLLAMA_HOST = '127.0.0.1:11434'
$env:OLLAMA_NO_CLOUD = '1'
$env:OLLAMA_BASE_URL = 'http://127.0.0.1:11434'
$listeners = @(Get-NetTCPConnection -LocalPort 11434 -State Listen -ErrorAction SilentlyContinue)
if ($listeners | Where-Object { $_.LocalAddress -notin @('127.0.0.1','::1') }) {
    throw 'Ollama lauscht außerhalb von Loopback. Ollama über das Tray beenden und erneut Start-Local.ps1 ausführen. Keine Ports öffnen.'
}
if ($listeners.Count -eq 0) {
    Start-Process -FilePath (Get-Command ollama).Source -ArgumentList 'serve' -WindowStyle Hidden
    Start-Sleep -Seconds 3
}
Write-Host 'Motivationsboost lokal: http://127.0.0.1:3210 — Beenden mit Strg+C.'
node scripts/local.mjs start
exit $LASTEXITCODE
