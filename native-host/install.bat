@echo off
echo Registering Chess Analyzer...

:: Get absolute path to manifest
set "MANIFEST_PATH=%~dp0com.chess.analyzer.json"
set "MANIFEST_PATH=%MANIFEST_PATH:\=\\%"

:: Add to Chrome Registry
reg add "HKCU\Software\Google\Chrome\NativeMessagingHosts\com.chess.analyzer" /ve /t REG_SZ /d "%~dp0com.chess.analyzer.json" /f

:: Add to Edge Registry
reg add "HKCU\Software\Microsoft\Edge\NativeMessagingHosts\com.chess.analyzer" /ve /t REG_SZ /d "%~dp0com.chess.analyzer.json" /f

echo Setup Complete!
pause
