$ErrorActionPreference = "Stop"

$workspaceRoot = $PSScriptRoot
$clientDir = Join-Path $workspaceRoot "src\sagacitysolutions.com.portal.Client"

Write-Host "🔄 Resetting Docker containers..." -ForegroundColor Cyan
Set-Location $workspaceRoot
docker-compose -f docker-compose.test.yml down -v
docker-compose -f docker-compose.test.yml up --build -d

Write-Host "⏳ Waiting for containers to initialize (10s)..." -ForegroundColor Cyan
Start-Sleep -Seconds 10

Write-Host "🌱 Running Logto and Database seeding script..." -ForegroundColor Cyan
Set-Location $clientDir
npm run seed:logto

Write-Host "🧪 Running E2E tests against real API (MOCK_API=false)..." -ForegroundColor Cyan
$env:MOCK_API = "false"
npm run test:e2e

Write-Host "✅ Complete!" -ForegroundColor Green
