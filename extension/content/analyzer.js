// Chess Analyzer - Main Analyzer Module
// Responsibilities: Orchestration, Backend Communication, Observers, Init

let currentController = null;
let mainObserver = null;
let boardObserver = null;
let lastFen = '';

async function analyzePosition(fen) {
    // Cancel previous request if exists
    if (currentController) {
        currentController.abort();
    }
    currentController = new AbortController();
    const controller = currentController; // Capture local reference

    const timeoutId = setTimeout(() => {
        if (controller) controller.abort();
    }, 5000); // 5s timeout

    isAnalyzing = true;

    try {
        const response = await fetch(CONFIG.serverUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                fen,
                depth: CONFIG.depth
            }),
            signal: controller.signal
        });

        if (!response.ok) {
            throw new Error(`Server error: ${response.status}`);
        }

        const data = await response.json();
        // console.log('[Chess Analyzer] Analysis result:', data);
        return data;
    } catch (error) {
        if (error.name === 'AbortError') {
            // console.log('[Chess Analyzer] Analysis aborted for new position');
        } else {
            // console.error('[Chess Analyzer] Analysis error:', error);
        }
        return null;
    } finally {
        clearTimeout(timeoutId);
        isAnalyzing = false;
        if (currentController === controller) {
            currentController = null;
        }
    }
}

async function analyzeAndDraw() {
    if (!CONFIG.enabled) return;

    const board = getBoard(); // from boardDetector.js
    if (!board) {
        // console.log('[Chess Analyzer] No board detected'); 
        return;
    }

    const fen = getCurrentFen(); // from fenBuilder.js
    if (!fen) {
        // console.log('[Chess Analyzer] Could not generate FEN');
        return;
    }

    // Only analyze if position changed
    if (fen === lastFen) return;
    lastFen = fen;

    // Clear arrows immediately on new position (prevents "both sides" arrows)
    removeArrows(); // from arrowRenderer.js

    // Check if we should analyze based on whose turn it is
    const currentTurnColor = detectActiveColor(); // from fenBuilder.js -> uses state
    // Note: detectActiveColor() returns internal state 'w'/'b'.

    // If user specificied a color (not auto), and it's NOT their turn, don't show analysis
    if (CONFIG.playerColor !== 'auto') {
        const playerChar = CONFIG.playerColor === 'white' ? 'w' : 'b';
        // detectActiveColor returns the ACTUAL turn on the board in manual mode
        if (currentTurnColor !== playerChar) {
            // console.log(`[Chess Analyzer] Skipping analysis - opponent's turn (${currentTurnColor} vs ${playerChar})`);
            return;
        }
    }

    // console.log('[Chess Analyzer] Analyzing new position:', fen);

    const result = await analyzePosition(fen);
    if (result && result.best_move) {
        // Double check FEN hasn't changed while we were analyzing
        if (getCurrentFen() !== fen) {
            // console.log('[Chess Analyzer] Board changed during analysis, discarding result');
            return;
        }

        const move = result.best_move;
        const from = move.substring(0, 2);
        const to = move.substring(2, 4);
        drawArrow(from, to); // from arrowRenderer.js
    }
}

// ========== MUTATION OBSERVER ==========

function setupObserver() {
    const board = getBoard();
    if (!board) {
        // Retry after a delay if board not found
        // console.log('[Chess Analyzer] Board not found, retrying in 500ms...');
        setTimeout(setupObserver, 500);
        return;
    }

    // Disconnect existing observer if any
    if (boardObserver) {
        boardObserver.disconnect();
    }

    boardObserver = new MutationObserver(() => {
        // Debounce - react quickly to changes
        clearTimeout(window.chessAnalyzerTimeout);
        window.chessAnalyzerTimeout = setTimeout(analyzeAndDraw, 150);
    });

    // Observe the board for piece movements
    boardObserver.observe(board, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['class', 'style', 'transform']
    });

    // Also observe the parent for board state changes
    if (board.parentElement) {
        boardObserver.observe(board.parentElement, {
            childList: true,
            subtree: false,
            attributes: true
        });
    }

    // console.log('[Chess Analyzer] Observer started on board');

    // Initial analysis
    analyzeAndDraw();
}

// Watch for page navigation / board appearing later
function setupPageObserver() {
    mainObserver = new MutationObserver(() => {
        const board = getBoard();
        if (board && !boardObserver) {
            // console.log('[Chess Analyzer] Board appeared, setting up observer');
            setupObserver();
        }
    });

    mainObserver.observe(document.body, {
        childList: true,
        subtree: true
    });
}

// ========== MESSAGE HANDLING ==========

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'GET_STATUS') {
        const board = getBoard();
        const fen = board ? getCurrentFen() : null;
        sendResponse({
            boardDetected: !!board,
            site: detectSite(),
            fen: fen,
            enabled: CONFIG.enabled
        });
    } else if (message.type === 'SET_ENABLED') {
        CONFIG.enabled = message.enabled;
        chrome.storage.local.set({ enabled: CONFIG.enabled });
        if (!CONFIG.enabled) {
            removeArrows();
        } else {
            analyzeAndDraw();
        }
        sendResponse({ success: true });
    } else if (message.type === 'UPDATE_SETTINGS') {
        // Update settings from popup
        if (message.settings.orientation !== undefined) {
            CONFIG.orientation = message.settings.orientation;
            // console.log('[Chess Analyzer] Orientation set to:', CONFIG.orientation);
        }
        if (message.settings.depth !== undefined) {
            CONFIG.depth = message.settings.depth;
            // console.log('[Chess Analyzer] Depth set to:', CONFIG.depth);
        }
        if (message.settings.playerColor !== undefined) {
            CONFIG.playerColor = message.settings.playerColor;
            // console.log('[Chess Analyzer] Player color set to:', CONFIG.playerColor);
        }
        // Force re-analysis with new settings
        lastFen = '';
        removeArrows();
        setTimeout(() => analyzeAndDraw(), 200);
        sendResponse({ success: true });
    } else if (message.type === 'ANALYZE_NOW') {
        lastFen = ''; // Force re-analysis
        analyzeAndDraw();
        sendResponse({ success: true });
    }
    return true;
});

// ========== INITIALIZATION ==========

function init() {
    // console.log('[Chess Analyzer] Initializing on', window.location.hostname);

    // load settings
    chrome.storage.local.get(['orientation', 'depth', 'enabled', 'playerColor'], (result) => {
        if (result.orientation) CONFIG.orientation = result.orientation;
        if (result.depth) CONFIG.depth = result.depth;
        if (result.enabled !== undefined) CONFIG.enabled = result.enabled;
        if (result.playerColor) CONFIG.playerColor = result.playerColor;
        // console.log('[Chess Analyzer] Settings loaded:', CONFIG);

        // Fix arrow drift on resize
        window.addEventListener('resize', () => {
            removeArrows();
            setTimeout(() => {
                if (CONFIG.enabled) analyzeAndDraw();
            }, 100);
        });

        // Add CSS for arrow overlay
        const style = document.createElement('style');
        style.textContent = `
            #chess-analyzer-overlay {
                pointer-events: none !important;
            }
            @keyframes arrowPulse {
                0%, 100% { opacity: 0.85; }
                50% { opacity: 0.6; }
            }
        `;
        document.head.appendChild(style);

        // Setup observers
        setupObserver();
        setupPageObserver();

        // Continuous polling as reliable backup (every 2000ms)
        setInterval(() => {
            if (document.hidden) return; // Don't run in background
            if (CONFIG.enabled) {
                analyzeAndDraw();
            }
        }, 2000);

        // console.log('[Chess Analyzer] Ready - will analyze automatically');
    });
}

// Start when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
