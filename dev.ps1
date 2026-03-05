# MedIntel — Dev Server Launcher (Windows PowerShell)
# Usage: .\dev.ps1

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$Backend = Join-Path $Root "backend"
$Frontend = Join-Path $Root "frontend"

Write-Host "Cleaning ports..." -ForegroundColor Yellow
# Kill any process on port 8000 (backend)
Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue |
    ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }

# Kill any process on port 3000 (frontend)
Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue |
    ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }

Write-Host "Starting MedIntel..." -ForegroundColor Green

# Start backend in a new terminal window
Start-Process powershell -ArgumentList @(
    "-NoExit", "-Command",
    "Set-Location '$Backend'; Write-Host 'Backend starting on http://localhost:8000' -ForegroundColor Cyan; uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"
) -WindowStyle Normal

# Start frontend in a new terminal window
Start-Process powershell -ArgumentList @(
    "-NoExit", "-Command",
    "Set-Location '$Frontend'; Write-Host 'Frontend starting on http://localhost:3000' -ForegroundColor Cyan; npm run dev"
) -WindowStyle Normal

Write-Host ""
Write-Host "MedIntel is starting:" -ForegroundColor Green
Write-Host "  Frontend  ->  http://localhost:3000" -ForegroundColor Cyan
Write-Host "  Backend   ->  http://localhost:8000" -ForegroundColor Cyan
Write-Host "  API Docs  ->  http://localhost:8000/docs" -ForegroundColor Cyan
Write-Host ""
Write-Host "Two new terminal windows have been opened." -ForegroundColor DarkGray
