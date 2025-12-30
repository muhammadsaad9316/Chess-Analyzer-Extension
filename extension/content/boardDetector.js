// Chess Analyzer - Board Detector Module
// Responsibilities: Site detection, Board Element, Orientation, Injected State

// Listen for updates from Injected Script (Main World)
window.addEventListener('message', (event) => {
    if (event.source !== window) return;
    if (event.data.type === 'CHESS_ANALYZER_STATE') {
        const payload = event.data.payload;
        gameState.fen = payload.fen;
        gameState.orientation = payload.orientation;
        gameState.lastUpdate = Date.now();
        gameState.source = 'JS_OBJECT';

        // console.log('[Chess Analyzer] Received State:', gameState);
    }
});

function detectSite() {
    if (window.location.hostname.includes('chess.com')) return 'chesscom';
    if (window.location.hostname.includes('lichess.org')) return 'lichess';
    return null;
}

function getChessComBoard() {
    // Try multiple selectors for Chess.com
    const selectors = [
        'wc-chess-board',
        'chess-board',
        '.board',
        '.chess-board',
        '[class*="board"]'
    ];

    for (const sel of selectors) {
        const el = document.querySelector(sel);
        if (el) {
            // console.log('[Chess Analyzer] Found board with selector:', sel);
            return el;
        }
    }
    // console.log('[Chess Analyzer] No Chess.com board found. Tried selectors:', selectors);
    return null;
}

function getLichessBoard() {
    return document.querySelector('cg-board') ||
        document.querySelector('.cg-wrap');
}

function getBoard() {
    const site = detectSite();
    // console.log('[Chess Analyzer] Detected site:', site);
    if (site === 'chesscom') return getChessComBoard();
    if (site === 'lichess') return getLichessBoard();
    return null;
}

function isBoardFlipped() {
    // Check manual override first
    if (CONFIG.orientation === 'white') return false;
    if (CONFIG.orientation === 'black') return true;

    // Priority 1: JS Object State (if recent < 2000ms)
    // Injected script provides 'orientation' as color string ('white'/'black' or 'w'/'b')
    if (gameState.source === 'JS_OBJECT' && (Date.now() - gameState.lastUpdate < 2000)) {
        const orient = gameState.orientation;
        const isBlack = orient === 'black' || orient === 'b';
        return isBlack;
    }

    // Auto-detect via DOM
    const site = detectSite();
    if (site === 'chesscom') {
        const board = getChessComBoard();
        if (board) {
            return board.classList.contains('flipped') ||
                board.getAttribute('data-flipped') === 'true';
        }
    }
    if (site === 'lichess') {
        const board = document.querySelector('.cg-wrap');
        if (board) {
            return board.classList.contains('orientation-black');
        }
    }
    return false;
}

function detectActiveColorFromDOM() {
    // ALWAYS re-check site and board orientation fresh
    const site = detectSite();

    if (site === 'chesscom') {
        // Priority 1: Check active clock (Most Reliable)
        const activeClock = document.querySelector('.clock-player-turn, .clock-active, .clock-component.clock-active');

        if (activeClock) {
            const rect = activeClock.getBoundingClientRect();
            const board = getBoard();

            if (board) {
                const boardRect = board.getBoundingClientRect();
                const boardCenterY = boardRect.top + boardRect.height / 2;
                const isBottomClock = rect.top > boardCenterY;

                // STRICT OVERRIDE: If "Playing As" is set, usage that truth
                if (CONFIG.playerColor === 'black') {
                    // If bottom clock is active, it's MY turn (Black). 
                    // If top clock is active, it's Opponent's turn (White).
                    return isBottomClock ? 'b' : 'w';
                }
                if (CONFIG.playerColor === 'white') {
                    // If bottom clock is active, it's MY turn (White).
                    return isBottomClock ? 'w' : 'b';
                }

                // Fallback: Use auto-detected board flip
                const flipped = isBoardFlipped();
                if (isBottomClock) {
                    return flipped ? 'b' : 'w';
                } else {
                    return flipped ? 'w' : 'b';
                }
            }
        }

        // Priority 2: Move list (Fallback)
        const moveNodes = document.querySelectorAll('.move-text-component, .node');
        const validMoves = Array.from(moveNodes).filter(n =>
            n.textContent && /^[a-h1-8N-R]/.test(n.textContent.trim())
        );

        if (validMoves.length > 0) {
            // This fallback is less reliable with "Playing As" but useful if clocks are hidden
            return validMoves.length % 2 === 0 ? 'w' : 'b';
        }

    } else if (site === 'lichess') {
        const turnIndicator = document.querySelector('.rclock-turn');

        if (turnIndicator) {
            const isBottomClock = turnIndicator.classList.contains('bottom');

            // STRICT OVERRIDE for Lichess too
            if (CONFIG.playerColor === 'black') return isBottomClock ? 'b' : 'w';
            if (CONFIG.playerColor === 'white') return isBottomClock ? 'w' : 'b';

            const flipped = isBoardFlipped();
            if (isBottomClock) {
                return flipped ? 'b' : 'w';
            } else {
                return flipped ? 'w' : 'b';
            }
        }

        // Fallback for Lichess
        const board = document.querySelector('.cg-wrap');
        if (board) {
            if (CONFIG.playerColor === 'black' && board.classList.contains('turn-black')) return 'b';
            if (CONFIG.playerColor === 'white' && board.classList.contains('turn-white')) return 'w';

            // Normal checks
            const moves = document.querySelectorAll('kwdb');
            if (moves.length > 0) return moves.length % 2 === 0 ? 'w' : 'b';
        }
    }

    // Default
    return 'w';
}
