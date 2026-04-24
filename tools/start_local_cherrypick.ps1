param(
  [int]$BackendPort = 8081,
  [int]$FrontendPort = 4173,
  [switch]$SkipBuild
)

$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$frontendDir = Join-Path $repoRoot 'frontend'
$distDir = Join-Path $frontendDir 'dist'
$backendJar = Join-Path $repoRoot 'backend\target\backend-0.1.0-SNAPSHOT.jar'
$pythonExe = 'C:\Users\Kasutaja\AppData\Local\Programs\Python\Python311\python.exe'

if (-not (Test-Path $backendJar)) {
  throw "Backend jar missing: $backendJar"
}

if (-not (Test-Path $pythonExe)) {
  throw "Python missing at $pythonExe"
}

if (-not $SkipBuild) {
  Write-Host "Building frontend for local API http://localhost:$BackendPort ..." -ForegroundColor Cyan
  Push-Location $frontendDir
  try {
    $env:VITE_API_BASE_URL = "http://localhost:$BackendPort"
    npm.cmd run build
    if ($LASTEXITCODE -ne 0) {
      throw "Frontend build failed with exit code $LASTEXITCODE"
    }
  } finally {
    Pop-Location
  }
} else {
  Write-Host "Skipping frontend build and using existing dist/" -ForegroundColor Yellow
}

if (-not (Test-Path $distDir)) {
  throw "Frontend dist missing after build: $distDir"
}

$backendCommand = "Set-Location '$repoRoot'; java -jar '$backendJar' --spring.profiles.active=dev --server.port=$BackendPort"
$frontendCommand = "Set-Location '$distDir'; & '$pythonExe' -m http.server $FrontendPort --bind 127.0.0.1"

Start-Process powershell.exe -ArgumentList '-NoExit', '-Command', $backendCommand | Out-Null
Start-Process powershell.exe -ArgumentList '-NoExit', '-Command', $frontendCommand | Out-Null

Write-Host ""
Write-Host "CherryPick local stack starting..." -ForegroundColor Green
Write-Host "Backend:  http://localhost:$BackendPort/health"
Write-Host "Frontend: http://127.0.0.1:$FrontendPort/"
Write-Host ""
Write-Host "Keep both spawned PowerShell windows open while testing."
