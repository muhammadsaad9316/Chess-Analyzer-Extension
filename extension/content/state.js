// Chess Analyzer - Shared State & Config

// Configuration
const CONFIG = {
    serverUrl: 'http://localhost:5000/analyze',
    pollInterval: 2000,
    enabled: true,
    orientation: 'auto', // 'auto', 'white', 'black'
    depth: 15,
    playerColor: 'auto' // 'auto', 'white', 'black' - which side you're playing as
};

// Piece Mapping
const PIECE_MAP = {
    // Chess.com format
    'wp': 'P', 'wn': 'N', 'wb': 'B', 'wr': 'R', 'wq': 'Q', 'wk': 'K',
    'bp': 'p', 'bn': 'n', 'bb': 'b', 'br': 'r', 'bq': 'q', 'bk': 'k',
    // Alternative format
    'wP': 'P', 'wN': 'N', 'wB': 'B', 'wR': 'R', 'wQ': 'Q', 'wK': 'K',
    'bP': 'p', 'bN': 'n', 'bB': 'b', 'bR': 'r', 'bQ': 'q', 'bK': 'k'
};

// Multi-layer State Object
const gameState = {
    fen: null,
    orientation: null,
    lastUpdate: 0,
    source: 'NONE' // 'JS_OBJECT', 'DOM', 'CACHE'
};

// Export to window for debugging if needed, though modules share scope
window.ChessAnalyzer = {
    CONFIG,
    PIECE_MAP,
    gameState
};
