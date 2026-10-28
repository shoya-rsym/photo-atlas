@echo off
rem Shared launcher. Usage: launch.cmd [/ | /manage]
setlocal
cd /d "%~dp0..\.."
set "PAGE=%~1"
if "%PAGE%"=="" set "PAGE=/"
if "%PORT%"=="" set "PORT=4321"

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js was not found. Please install Node.js first.
  pause
  exit /b 1
)

if not exist node_modules (
  echo Installing dependencies...
  call npm install
  if errorlevel 1 (
    echo npm install failed.
    pause
    exit /b 1
  )
)

rem If the server is already running, only open the browser.
powershell -NoProfile -Command "if ((Test-NetConnection 127.0.0.1 -Port %PORT% -WarningAction SilentlyContinue).TcpTestSucceeded) { exit 0 } else { exit 1 }" >nul 2>nul
if not errorlevel 1 (
  start "" "http://127.0.0.1:%PORT%%PAGE%"
  exit /b 0
)

rem Open the browser a few seconds after the server starts.
start "" /b powershell -NoProfile -Command "Start-Sleep 3; Start-Process 'http://127.0.0.1:%PORT%%PAGE%'"
echo Photo tool server is running. Close this window to stop it.
node tools\photo-import\server.mjs
echo.
echo The server has stopped.
pause
