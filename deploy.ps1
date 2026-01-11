# SELAI Admin Hub - Deploy Script
# סקריפט פריסה לשרת Windows פנימי

param(
    [string]$ServerIP = "10.0.0.69",
    [string]$RemotePath = "C$\Apps\selai-admin-hub",
    [switch]$BuildOnly,
    [switch]$CopyOnly,
    [switch]$Help
)

# צבעים
$Colors = @{
    Success = "Green"
    Error = "Red"
    Warning = "Yellow"
    Info = "Cyan"
}

function Write-Step($message) {
    Write-Host "`n>> $message" -ForegroundColor $Colors.Info
}

function Write-Success($message) {
    Write-Host "[OK] $message" -ForegroundColor $Colors.Success
}

function Write-Error($message) {
    Write-Host "[ERROR] $message" -ForegroundColor $Colors.Error
}

if ($Help) {
    Write-Host @"

SELAI Admin Hub - Deploy Script
================================

Usage:
    .\deploy.ps1              # Full deploy (build + copy + restart)
    .\deploy.ps1 -BuildOnly   # Only build locally
    .\deploy.ps1 -CopyOnly    # Only copy to server (skip build)

Parameters:
    -ServerIP    Server IP address (default: 10.0.0.69)
    -RemotePath  Remote path (default: C$\Apps\selai-admin-hub)
    -Help        Show this help

Requirements:
    - VPN connection to internal network
    - Access to server share (\\10.0.0.69\C$)
    - Node.js and npm installed locally

"@
    exit 0
}

Write-Host @"

  ____  _____ _        _    ___
 / ___|| ____| |      / \  |_ _|
 \___ \|  _| | |     / _ \  | |
  ___) | |___| |___ / ___ \ | |
 |____/|_____|_____/_/   \_\___|

  Admin Hub - Deploy Script
  Target: $ServerIP

"@ -ForegroundColor Cyan

# === Step 1: Check VPN/Network ===
Write-Step "Checking network connection to $ServerIP..."

$ping = Test-Connection -ComputerName $ServerIP -Count 1 -Quiet
if (-not $ping) {
    Write-Error "Cannot reach $ServerIP - Are you connected to VPN?"
    Write-Host "`nTry:" -ForegroundColor Yellow
    Write-Host "  1. Connect to VPN first"
    Write-Host "  2. Run: ping $ServerIP"
    Write-Host "  3. Try again`n"
    exit 1
}
Write-Success "Server is reachable"

# === Step 2: Check server share access ===
Write-Step "Checking access to server share..."

$sharePath = "\\$ServerIP\$RemotePath"
$shareRoot = "\\$ServerIP\C$"

if (-not (Test-Path $shareRoot)) {
    Write-Error "Cannot access $shareRoot"
    Write-Host "`nYou may need to:" -ForegroundColor Yellow
    Write-Host "  1. Open File Explorer"
    Write-Host "  2. Go to: $shareRoot"
    Write-Host "  3. Enter credentials when prompted"
    Write-Host "  4. Try again`n"
    exit 1
}
Write-Success "Share access confirmed"

# === Step 3: Build (unless -CopyOnly) ===
if (-not $CopyOnly) {
    Write-Step "Building project..."

    # Check if we're in the right directory
    if (-not (Test-Path "package.json")) {
        Write-Error "package.json not found. Run this script from the project root."
        exit 1
    }

    # Install dependencies if needed
    if (-not (Test-Path "node_modules")) {
        Write-Host "Installing dependencies..." -ForegroundColor Yellow
        npm install
    }

    # Build
    npm run build
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Build failed!"
        exit 1
    }
    Write-Success "Build completed"
}

if ($BuildOnly) {
    Write-Success "Build only mode - done!"
    exit 0
}

# === Step 4: Create remote directory ===
Write-Step "Preparing remote directory..."

$remoteFullPath = "\\$ServerIP\$RemotePath"
if (-not (Test-Path $remoteFullPath)) {
    New-Item -ItemType Directory -Path $remoteFullPath -Force | Out-Null
    Write-Success "Created $remoteFullPath"
} else {
    Write-Success "Directory exists"
}

# === Step 5: Copy files ===
Write-Step "Copying files to server..."

$filesToCopy = @(
    "dist",
    "public",
    "package.json",
    "package-lock.json",
    "vite.config.ts",
    "index.html",
    "tsconfig.json",
    "tailwind.config.ts",
    "postcss.config.js",
    "components.json"
)

# Also copy src for development if needed
$filesToCopy += "src"

$copied = 0
foreach ($item in $filesToCopy) {
    if (Test-Path $item) {
        $dest = Join-Path $remoteFullPath $item

        if (Test-Path $item -PathType Container) {
            # Directory - use robocopy for efficiency
            $null = robocopy $item $dest /E /NFL /NDL /NJH /NJS /NC /NS /NP
        } else {
            # File
            Copy-Item $item $dest -Force
        }
        $copied++
        Write-Host "  Copied: $item" -ForegroundColor Gray
    }
}

Write-Success "Copied $copied items"

# === Step 6: Create .env.local if not exists ===
Write-Step "Checking environment file..."

$envRemotePath = Join-Path $remoteFullPath ".env.local"
$envExamplePath = Join-Path $remoteFullPath ".env.production.example"

# Copy the example file
if (Test-Path ".env.production.example") {
    Copy-Item ".env.production.example" $envExamplePath -Force
}

if (-not (Test-Path $envRemotePath)) {
    if (Test-Path ".env.local") {
        Copy-Item ".env.local" $envRemotePath -Force
        Write-Success "Copied .env.local to server"
    } else {
        Write-Host "  [WARNING] No .env.local found. Create one on the server!" -ForegroundColor Yellow
        Write-Host "  Template at: $envExamplePath" -ForegroundColor Yellow
    }
} else {
    Write-Success ".env.local already exists on server (not overwritten)"
}

# === Step 7: Create PM2 ecosystem file ===
Write-Step "Creating PM2 configuration..."

$pm2Config = @"
module.exports = {
  apps: [{
    name: 'selai-admin-hub',
    script: 'npm',
    args: 'run preview',
    cwd: 'C:\\Apps\\selai-admin-hub',
    env: {
      NODE_ENV: 'production',
      PORT: 4173
    },
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    error_file: 'C:\\Apps\\selai-admin-hub\\logs\\error.log',
    out_file: 'C:\\Apps\\selai-admin-hub\\logs\\out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
  }]
};
"@

$pm2ConfigPath = Join-Path $remoteFullPath "ecosystem.config.js"
$pm2Config | Out-File -FilePath $pm2ConfigPath -Encoding UTF8
Write-Success "Created ecosystem.config.js"

# Create logs directory
$logsPath = Join-Path $remoteFullPath "logs"
if (-not (Test-Path $logsPath)) {
    New-Item -ItemType Directory -Path $logsPath -Force | Out-Null
}

# === Step 8: Create server setup script ===
Write-Step "Creating server setup script..."

$serverSetup = @"
# Run this script ON THE SERVER (10.0.0.69)
# Open PowerShell as Administrator and run:
# cd C:\Apps\selai-admin-hub
# .\server-setup.ps1

Write-Host "SELAI Admin Hub - Server Setup" -ForegroundColor Cyan
Write-Host "===============================" -ForegroundColor Cyan

# Check Node.js
`$nodeVersion = node --version 2>`$null
if (-not `$nodeVersion) {
    Write-Host "[ERROR] Node.js not installed!" -ForegroundColor Red
    Write-Host "Download from: https://nodejs.org/en/download/" -ForegroundColor Yellow
    exit 1
}
Write-Host "[OK] Node.js: `$nodeVersion" -ForegroundColor Green

# Install dependencies
Write-Host "`nInstalling dependencies..." -ForegroundColor Cyan
npm install

# Install PM2 if needed
`$pm2Version = pm2 --version 2>`$null
if (-not `$pm2Version) {
    Write-Host "Installing PM2..." -ForegroundColor Yellow
    npm install -g pm2
    npm install -g pm2-windows-startup
    pm2-startup install
}
Write-Host "[OK] PM2 installed" -ForegroundColor Green

# Check .env.local
if (-not (Test-Path ".env.local")) {
    Write-Host "[WARNING] .env.local not found!" -ForegroundColor Yellow
    Write-Host "Copy from .env.production.example and fill in the values" -ForegroundColor Yellow
    exit 1
}
Write-Host "[OK] .env.local exists" -ForegroundColor Green

# Start with PM2
Write-Host "`nStarting application..." -ForegroundColor Cyan
pm2 delete selai-admin-hub 2>`$null
pm2 start ecosystem.config.js
pm2 save

Write-Host "`n========================================" -ForegroundColor Green
Write-Host "[SUCCESS] Application is running!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host "`nAccess at: http://localhost:4173" -ForegroundColor Cyan
Write-Host "Or from network: http://10.0.0.69:4173" -ForegroundColor Cyan
Write-Host "`nUseful commands:" -ForegroundColor Yellow
Write-Host "  pm2 status          - Check status"
Write-Host "  pm2 logs            - View logs"
Write-Host "  pm2 restart all     - Restart app"
Write-Host "  pm2 stop all        - Stop app"
"@

$serverSetupPath = Join-Path $remoteFullPath "server-setup.ps1"
$serverSetup | Out-File -FilePath $serverSetupPath -Encoding UTF8
Write-Success "Created server-setup.ps1"

# === Done! ===
Write-Host @"

========================================
       DEPLOY COMPLETED!
========================================

Files copied to: \\$ServerIP\$RemotePath

NEXT STEPS:
-----------
1. Connect to server via RDP:
   IP: $ServerIP

2. Open PowerShell as Administrator

3. Run:
   cd C:\Apps\selai-admin-hub
   .\server-setup.ps1

4. Access the app:
   http://$ServerIP:4173

"@ -ForegroundColor Green
