// Chess Analyzer - Popup Script

document.addEventListener('DOMContentLoaded', async () => {
    const serverDot = document.getElementById('server-dot');
    const serverStatus = document.getElementById('server-status');
    const boardDot = document.getElementById('board-dot');
    const boardStatus = document.getElementById('board-status');
    const siteStatus = document.getElementById('site-status');
    const enableToggle = document.getElementById('enable-toggle');
    const analyzeBtn = document.getElementById('analyze-btn');
    const fenContainer = document.getElementById('fen-container');
    const fenDisplay = document.getElementById('fen-display');

    const serverControl = document.getElementById('server-control');
    const startServerBtn = document.getElementById('start-server-btn');

    // Check server health
    async function checkServer() {
        try {
            const response = await fetch('http://localhost:5000/health', {
                method: 'GET',
                signal: AbortSignal.timeout(3000)
            });

            if (response.ok) {
                serverDot.className = 'status-dot online';
                serverStatus.textContent = 'Online';
                serverControl.style.display = 'none';
                return true;
            }
        } catch (e) {
            console.log('Server check failed:', e);
        }

        serverDot.className = 'status-dot offline';
        serverStatus.textContent = 'Offline';
        serverControl.style.display = 'block';
        return false;
    }

    startServerBtn.addEventListener('click', async () => {
        startServerBtn.textContent = '⚡ Starting...';
        startServerBtn.disabled = true;

        chrome.runtime.sendMessage({ type: 'START_SERVER' }, (response) => {
            if (response && response.success) {
                // Wait a moment for server to spin up
                setTimeout(() => {
                    checkServer();
                    startServerBtn.textContent = '⚡ Start Server';
                    startServerBtn.disabled = false;
                }, 3000);
            } else {
                startServerBtn.textContent = '❌ Failed';
                if (response && response.message) {
                    alert('Failed to start server: ' + response.message);
                } else {
                    alert('Failed to start server. Make sure Native Host is installed.');
                }
                setTimeout(() => {
                    startServerBtn.textContent = '⚡ Start Server';
                    startServerBtn.disabled = false;
                }, 2000);
            }
        });
    });

    // Check board status from content script
    async function checkBoard() {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

            if (!tab || !tab.url) {
                setBoardOffline('No tab');
                return;
            }

            // Check if we're on a supported site
            if (!tab.url.includes('chess.com') && !tab.url.includes('lichess.org')) {
                setBoardOffline('Not a chess site');
                return;
            }

            const response = await chrome.tabs.sendMessage(tab.id, { type: 'GET_STATUS' });

            if (response.boardDetected) {
                boardDot.className = 'status-dot online';
                boardStatus.textContent = 'Detected';
                siteStatus.textContent = response.site === 'chesscom' ? 'Chess.com' : 'Lichess';
                enableToggle.checked = response.enabled;

                if (response.fen) {
                    fenContainer.style.display = 'block';
                    fenDisplay.textContent = response.fen;
                }
            } else {
                setBoardOffline('Not found');
            }
        } catch (e) {
            console.log('Board check failed:', e);
            setBoardOffline('Error');
        }
    }

    function setBoardOffline(status) {
        boardDot.className = 'status-dot offline';
        boardStatus.textContent = status;
        siteStatus.textContent = '—';
    }

    // Toggle handler
    enableToggle.addEventListener('change', async () => {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tab) {
                await chrome.tabs.sendMessage(tab.id, {
                    type: 'SET_ENABLED',
                    enabled: enableToggle.checked
                });
            }
        } catch (e) {
            console.log('Toggle failed:', e);
        }
    });

    // Analyze button handler
    analyzeBtn.addEventListener('click', async () => {
        analyzeBtn.textContent = '⏳ Analyzing...';
        analyzeBtn.disabled = true;

        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tab) {
                await chrome.tabs.sendMessage(tab.id, { type: 'ANALYZE_NOW' });
            }

            // Refresh status after a short delay
            setTimeout(async () => {
                await checkBoard();
                analyzeBtn.textContent = '🔍 Analyze Now';
                analyzeBtn.disabled = false;
            }, 1500);
        } catch (e) {
            console.log('Analyze failed:', e);
            analyzeBtn.textContent = '🔍 Analyze Now';
            analyzeBtn.disabled = false;
        }
    });

    // Initial checks
    await checkServer();
    await checkBoard();

    // Load saved settings
    chrome.storage.local.get(['orientation', 'depth', 'playerColor'], (result) => {
        if (result.orientation) {
            document.getElementById('orientation-select').value = result.orientation;
        }
        if (result.depth) {
            document.getElementById('depth-select').value = result.depth;
        }
        if (result.playerColor) {
            document.getElementById('player-color-select').value = result.playerColor;
        }
    });

    // Settings handlers
    document.getElementById('player-color-select').addEventListener('change', async (e) => {
        const playerColor = e.target.value;
        await chrome.storage.local.set({ playerColor });

        // Notify content script
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tab) {
                await chrome.tabs.sendMessage(tab.id, {
                    type: 'UPDATE_SETTINGS',
                    settings: { playerColor }
                });
            }
        } catch (e) {
            console.log('Settings update failed:', e);
        }
    });

    document.getElementById('orientation-select').addEventListener('change', async (e) => {
        const orientation = e.target.value;
        await chrome.storage.local.set({ orientation });

        // Notify content script
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tab) {
                await chrome.tabs.sendMessage(tab.id, {
                    type: 'UPDATE_SETTINGS',
                    settings: { orientation }
                });
            }
        } catch (e) {
            console.log('Settings update failed:', e);
        }
    });

    document.getElementById('depth-select').addEventListener('change', async (e) => {
        const depth = parseInt(e.target.value);
        await chrome.storage.local.set({ depth });

        // Notify content script
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tab) {
                await chrome.tabs.sendMessage(tab.id, {
                    type: 'UPDATE_SETTINGS',
                    settings: { depth }
                });
            }
        } catch (e) {
            console.log('Settings update failed:', e);
        }
    });

    // Refresh periodically
    setInterval(checkServer, 5000);
    setInterval(checkBoard, 3000);
});
