# SELAI - Test Server Connection
# בדיקת חיבור לשרת לפני פריסה

$ServerIP = "10.0.0.69"

Write-Host @"

  Testing Connection to Server
  ============================
  Target: $ServerIP

"@ -ForegroundColor Cyan

# Test 1: Ping
Write-Host "1. Testing ping..." -ForegroundColor Yellow
$ping = Test-Connection -ComputerName $ServerIP -Count 2 -Quiet
if ($ping) {
    Write-Host "   [OK] Server responds to ping" -ForegroundColor Green
} else {
    Write-Host "   [FAIL] Cannot ping server" -ForegroundColor Red
    Write-Host "   -> Are you connected to VPN?" -ForegroundColor Yellow
    exit 1
}

# Test 2: RDP Port
Write-Host "`n2. Testing RDP port (3389)..." -ForegroundColor Yellow
$rdp = Test-NetConnection -ComputerName $ServerIP -Port 3389 -WarningAction SilentlyContinue
if ($rdp.TcpTestSucceeded) {
    Write-Host "   [OK] RDP port is open" -ForegroundColor Green
} else {
    Write-Host "   [FAIL] RDP port closed or blocked" -ForegroundColor Red
}

# Test 3: SMB/File Share
Write-Host "`n3. Testing file share access..." -ForegroundColor Yellow
$sharePath = "\\$ServerIP\C$"
try {
    $access = Test-Path $sharePath -ErrorAction Stop
    if ($access) {
        Write-Host "   [OK] Can access $sharePath" -ForegroundColor Green
    } else {
        Write-Host "   [FAIL] Share not accessible" -ForegroundColor Red
        Write-Host "   -> Try opening $sharePath in File Explorer first" -ForegroundColor Yellow
    }
} catch {
    Write-Host "   [FAIL] Cannot access share: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "   -> Open File Explorer and go to: $sharePath" -ForegroundColor Yellow
    Write-Host "   -> Enter your credentials when prompted" -ForegroundColor Yellow
}

# Test 4: Check if Apps folder exists
Write-Host "`n4. Checking Apps folder..." -ForegroundColor Yellow
$appsPath = "\\$ServerIP\C$\Apps"
if (Test-Path $appsPath) {
    Write-Host "   [OK] C:\Apps exists on server" -ForegroundColor Green
} else {
    Write-Host "   [INFO] C:\Apps doesn't exist yet (will be created)" -ForegroundColor Yellow
}

# Summary
Write-Host "`n==============================" -ForegroundColor Cyan
Write-Host "Connection Test Complete" -ForegroundColor Cyan
Write-Host "==============================" -ForegroundColor Cyan

if ($ping -and $rdp.TcpTestSucceeded) {
    Write-Host "`n[READY] You can run: .\deploy.ps1" -ForegroundColor Green
} else {
    Write-Host "`n[NOT READY] Fix the issues above first" -ForegroundColor Red
}
