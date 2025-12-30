// Chess Analyzer - Injected Script
// Runs in the "Main World" to access the website's internal JavaScript objects

(function () {
    'use strict';

    const POLL_INTERVAL = 200;
    const EXTENSION_ID = document.currentScript?.getAttribute('data-extension-id') || 'unknown';

    let lastFen = '';
    let lastOrientation = '';

    function log(msg, data) {
        // console.log(`[Chess Analyzer Injected] ${msg}`, data || '');
    }

    // ========== CHESS.COM ACCESSOR ==========
    function getChessComState() {
        try {
            // Strategy 1: <chess-board> element property (Modern)
            const boardEl = document.querySelector('chess-board');
            if (boardEl && boardEl.game) {
                const game = boardEl.game;
                // Verify methods exist
                if (typeof game.getFEN === 'function') {
                    return {
                        fen: game.getFEN(),
                        orientation: game.getPlayingAs ? game.getPlayingAs() : (boardEl.getAttribute('orientation') || 'white')
                    };
                }
            }

            // Strategy 2: Global Chess object (Legacy)
            if (window.Chess && window.Chess.game && typeof window.Chess.game.getFEN === 'function') {
                return {
                    fen: window.Chess.game.getFEN(),
                    orientation: window.Chess.game.getPlayingAs ? window.Chess.game.getPlayingAs() : 'white'
                };
            }
        } catch (e) {
            // log('Error accessing Chess.com state:', e);
        }
        return null;
    }

    // ========== LICHESS ACCESSOR ==========
    function getLichessState() {
        try {
            // Lichess exposes a global 'lichess' object
            if (window.lichess) {
                const analysis = window.lichess.analysis;
                const round = window.lichess.round;

                // Priority: Analysis Board -> Play Board
                if (analysis && analysis.data) {
                    // In analysis, orientation is often in data.orientation
                    return {
                        fen: analysis.node.fen,
                        orientation: analysis.data.orientation || 'white'
                    };
                }

                if (round && round.data) {
                    return {
                        fen: round.data.fen,
                        orientation: round.data.player.color || 'white'
                    };
                }
            }
        } catch (e) {
            // log('Error accessing Lichess state:', e);
        }
        return null;
    }

    function scanGameState() {
        let state = null;
        const host = window.location.hostname;

        if (host.includes('chess.com')) {
            state = getChessComState();
        } else if (host.includes('lichess.org')) {
            state = getLichessState();
        }

        if (state && state.fen) {
            // Only post if changed to reduce noise (though content script debounces too)
            if (state.fen !== lastFen || state.orientation !== lastOrientation) {
                lastFen = state.fen;
                lastOrientation = state.orientation;

                // Send to Content Script
                window.postMessage({
                    type: 'CHESS_ANALYZER_STATE',
                    payload: {
                        fen: state.fen,
                        orientation: state.orientation,
                        source: 'JS_OBJECT'
                    }
                }, '*');

                log('Broadcasted state', state);
            }
        }
    }

    // Start Polling
    setInterval(scanGameState, POLL_INTERVAL);
    log('Started (Main World)');

})();
