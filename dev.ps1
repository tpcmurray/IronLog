# IronLog Development Launcher
# Starts Postgres (Docker), API server, Vite dev server, then opens Chrome.

$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot

# --- Preflight checks ---
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Host 'ERROR: Docker not found. Install Docker Desktop first.' -ForegroundColor Red
    exit 1
}

$dockerStatus = docker info 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host 'ERROR: Docker daemon is not running. Start Docker Desktop first.' -ForegroundColor Red
    exit 1
}

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host 'ERROR: Node.js not found.' -ForegroundColor Red
    exit 1
}

# --- Check for .env, create from example if missing ---
$envFile = Join-Path $root '.env'
$envExample = Join-Path $root '.env.example'
if (-not (Test-Path $envFile)) {
    if (Test-Path $envExample) {
        Copy-Item $envExample $envFile
        Write-Host 'Created .env from .env.example -- edit credentials if needed.' -ForegroundColor Yellow
    } else {
        Write-Host 'ERROR: No .env or .env.example found.' -ForegroundColor Red
        exit 1
    }
}

# --- Load .env into process environment ---
Get-Content $envFile | ForEach-Object {
    if ($_ -match '^\s*([^#][^=]+)=(.*)$') {
        $key = $matches[1].Trim()
        $val = $matches[2].Trim()
        [Environment]::SetEnvironmentVariable($key, $val, 'Process')
    }
}

# --- Install dependencies if needed ---
$serverDir = Join-Path $root 'server'
$clientDir = Join-Path $root 'client'

if (-not (Test-Path (Join-Path $serverDir 'node_modules'))) {
    Write-Host 'Installing server dependencies...' -ForegroundColor Cyan
    Push-Location $serverDir
    npm install
    Pop-Location
}

if (-not (Test-Path (Join-Path $clientDir 'node_modules'))) {
    Write-Host 'Installing client dependencies...' -ForegroundColor Cyan
    Push-Location $clientDir
    npm install
    Pop-Location
}

# --- Start Postgres via Docker Compose ---
$composeFile = Join-Path $root 'docker-compose.yml'
Write-Host 'Starting Postgres...' -ForegroundColor Cyan
docker compose -f $composeFile up -d db

# Wait for Postgres to be ready
Write-Host 'Waiting for Postgres to accept connections...' -ForegroundColor Cyan
$attempts = 0
$maxAttempts = 30
do {
    Start-Sleep -Seconds 1
    $attempts++
    try {
        $ErrorActionPreference = 'Continue'
        $health = docker compose -f $composeFile ps db --format json 2>$null | ConvertFrom-Json
        $ErrorActionPreference = 'Stop'
        $ready = $health.Health -eq 'healthy'
    } catch {
        $ErrorActionPreference = 'Stop'
        $ready = $false
    }
    if (-not $ready) { Write-Host "  ...waiting ($attempts/$maxAttempts)" }
} while (-not $ready -and $attempts -lt $maxAttempts)

if (-not $ready) {
    Write-Host 'ERROR: Postgres did not become healthy in time.' -ForegroundColor Red
    exit 1
}
Write-Host 'Postgres is ready.' -ForegroundColor Green

# --- Start API server ---
Write-Host 'Starting API server on port 3001...' -ForegroundColor Cyan
$apiJob = Start-Process -FilePath 'node' -ArgumentList 'src/index.js' -WorkingDirectory $serverDir -PassThru -NoNewWindow

# Give the API a moment to run migrations and start
Start-Sleep -Seconds 3

# --- Start Vite dev server ---
Write-Host 'Starting Vite dev server...' -ForegroundColor Cyan
$viteJob = Start-Process -FilePath 'cmd' -ArgumentList '/c npx vite --host' -WorkingDirectory $clientDir -PassThru -NoNewWindow

Start-Sleep -Seconds 2

# --- Open Chrome ---
Write-Host 'Opening Chrome at http://localhost:5173 ...' -ForegroundColor Green
Start-Process 'http://localhost:5173'

# --- Wait for Ctrl+C, then clean up ---
Write-Host ''
Write-Host '=== IronLog is running ===' -ForegroundColor Green
Write-Host '  Client:  http://localhost:5173' -ForegroundColor White
Write-Host '  API:     http://localhost:3001' -ForegroundColor White
Write-Host '  DB:      localhost:5432' -ForegroundColor White
Write-Host ''
Write-Host 'Press Ctrl+C to stop all services.' -ForegroundColor Yellow

try {
    while ($true) { Start-Sleep -Seconds 1 }
} finally {
    Write-Host ''
    Write-Host 'Shutting down...' -ForegroundColor Cyan
    if ($apiJob -and -not $apiJob.HasExited) { Stop-Process -Id $apiJob.Id -Force -ErrorAction SilentlyContinue }
    if ($viteJob -and -not $viteJob.HasExited) { Stop-Process -Id $viteJob.Id -Force -ErrorAction SilentlyContinue }
    docker compose -f $composeFile stop db
    Write-Host 'All services stopped.' -ForegroundColor Green
}
