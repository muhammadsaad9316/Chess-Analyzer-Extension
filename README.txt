CHESS ANALYZER
========================================================================

INSTALLATION (One-Time Setup)
------------------------------------------------------------------------

1. Double-click INSTALL.bat
   -> Click "YES" when Windows asks for permission

2. When prompted, load the extension in Chrome:
   -> Go to chrome://extensions
   -> Enable "Developer mode" (top-right toggle)
   -> Click "Load unpacked" -> Select the "extension" folder

3. Done! A shortcut "Play Chess Analyzer" is on your desktop.


DAILY USE
------------------------------------------------------------------------

Just double-click "Play Chess Analyzer" on your desktop!

The server starts automatically - no extra steps needed.


WHAT IT DOES
------------------------------------------------------------------------

* Shows the best move with colored arrows on the board
* Works on Chess.com and Lichess.org
* Uses Stockfish engine running locally (100% private)
* No data is sent to any external servers


TROUBLESHOOTING
------------------------------------------------------------------------

PROBLEM: Arrows don't appear
FIX: Click the extension icon -> Make sure "Server Running" shows green
     If not, click "Start Server" or run LAUNCH.bat

PROBLEM: Extension not visible in Chrome
FIX: Run INSTALL.bat again, then reload the extension

PROBLEM: Windows Defender blocks server.exe
FIX: Click "More Info" -> "Run Anyway"
     Or add the Release folder to Windows Defender exclusions

PROBLEM: "Native host not found" error
FIX: Run INSTALL.bat again (it configures the paths)


FOLDER CONTENTS
------------------------------------------------------------------------

INSTALL.bat      - Run once to set up everything
LAUNCH.bat       - Run daily to start playing (also creates shortcut)
backend/         - Contains the analysis server
extension/       - Chrome extension files
native-host/     - Bridge between Chrome and server


========================================================================
Made with love for chess enthusiasts | Version 1.0.0
