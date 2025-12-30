@echo off
setlocal EnableDelayedExpansion
cd /d "%~dp0"

:: ============================================================================
:: CHESS ANALYZER - DAILY LAUNCHER
:: ============================================================================
:: This script starts the server and opens Chrome with the extension loaded.
:: Use this shortcut every time you want to play chess with analysis.
:: ============================================================================

title Chess Analyzer

:: Get paths
set "INSTALL_PATH=%~dp0"
set "INSTALL_PATH=%INSTALL_PATH:~0,-1%"
set "SERVER_PATH=%INSTALL_PATH%\backend\server.exe"
set "EXT_PATH=%INSTALL_PATH%\extension"

:: Check if server is already running
netstat -ano 2>nul | findstr ":5000" | findstr "LISTENING" >nul
if %errorlevel% equ 0 (
    echo Server already running...
    goto :LaunchChrome
)

:: Kill any zombie server processes
taskkill /F /IM server.exe >nul 2>&1

:: Start server in background (hidden window)
echo Starting Chess Analyzer server...
start /B /MIN "" "%SERVER_PATH%"

:: Wait for server to be ready (max 5 seconds)
set "ATTEMPTS=0"
:WaitLoop
timeout /t 1 /nobreak >nul
set /a ATTEMPTS+=1
netstat -ano 2>nul | findstr ":5000" | findstr "LISTENING" >nul
if %errorlevel% equ 0 (
    echo Server ready!
    goto :LaunchChrome
)
if %ATTEMPTS% lss 5 goto :WaitLoop

echo Server may take a moment to start...

:LaunchChrome
:: Find Chrome
set "CHROME_PATH="
for /f "tokens=2*" %%A in ('reg query "HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\chrome.exe" /ve 2^>nul') do set "CHROME_PATH=%%B"
if not defined CHROME_PATH (
    for /f "tokens=2*" %%A in ('reg query "HKCU\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\chrome.exe" /ve 2^>nul') do set "CHROME_PATH=%%B"
)

:: Launch Chrome with extension
if defined CHROME_PATH (
    echo Launching Chrome...
    start "" "%CHROME_PATH%" --load-extension="%EXT_PATH%" "https://www.chess.com/play/online"
) else (
    echo Chrome not found. Please open Chrome manually.
    echo Then go to: https://www.chess.com/play/online
    pause
)

:: Exit silently (don't close server)
exit /b 0
