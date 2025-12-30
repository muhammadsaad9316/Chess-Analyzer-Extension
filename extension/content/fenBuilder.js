// Chess Analyzer - FEN Builder Module
// Responsibilities: DOM Parsing, FEN Generation, State Fallback

let currentTurn = 'w';
let lastPieces = '';

function detectActiveColor(pieces) {
    // Initialize state if needed
    if (!lastPieces) {
        lastPieces = pieces;
        // Seed with DOM because we have no history
        currentTurn = detectActiveColorFromDOM(); // from boardDetector.js
        // console.log('[Chess Analyzer] Initialized turn state:', currentTurn);
        return currentTurn;
    }

    // Check for board change
    if (pieces !== lastPieces) {
        // Board changed -> toggle turn
        currentTurn = (currentTurn === 'w' ? 'b' : 'w');
        lastPieces = pieces;
        // console.log('[Chess Analyzer] Turn toggled to:', currentTurn);
    }

    // Safety: If start position, force White
    const START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPP1PPP/RNBQKBNR";
    if (pieces === START_FEN) {
        currentTurn = 'w';
        // console.log('[Chess Analyzer] Start position detected, forced turn: w');
    }

    return currentTurn;
}

// ========== CHESS.COM BOARD PARSING ==========

function parseChessComBoard() {
    const board = Array(8).fill(null).map(() => Array(8).fill(null));
    const pieces = document.querySelectorAll('.piece');

    pieces.forEach(piece => {
        const classList = Array.from(piece.classList);

        // Find piece type (wp, wn, bp, etc.)
        let pieceType = null;
        for (const cls of classList) {
            if (PIECE_MAP[cls]) {
                pieceType = PIECE_MAP[cls];
                break;
            }
        }

        // Find square (square-34 means column 3, row 4)
        let square = null;
        for (const cls of classList) {
            if (cls.startsWith('square-')) {
                square = cls.replace('square-', '');
                break;
            }
        }

        if (pieceType && square && square.length === 2) {
            const col = parseInt(square[0]) - 1; // 0-indexed
            const row = parseInt(square[1]) - 1; // 0-indexed
            if (col >= 0 && col < 8 && row >= 0 && row < 8) {
                board[7 - row][col] = pieceType;
            }
        }
    });

    return board;
}

// ========== LICHESS BOARD PARSING ==========

function parseLichessBoard() {
    const board = Array(8).fill(null).map(() => Array(8).fill(null));
    const cgBoard = document.querySelector('cg-board');
    if (!cgBoard) return board;

    const pieces = cgBoard.querySelectorAll('piece');
    const boardRect = cgBoard.getBoundingClientRect();
    const squareSize = boardRect.width / 8;
    const flipped = isBoardFlipped(); // from boardDetector.js

    pieces.forEach(piece => {
        const classList = Array.from(piece.classList);

        // Determine piece color and type
        const isWhite = classList.includes('white');
        let pieceType = null;

        if (classList.includes('pawn')) pieceType = isWhite ? 'P' : 'p';
        else if (classList.includes('knight')) pieceType = isWhite ? 'N' : 'n';
        else if (classList.includes('bishop')) pieceType = isWhite ? 'B' : 'b';
        else if (classList.includes('rook')) pieceType = isWhite ? 'R' : 'r';
        else if (classList.includes('queen')) pieceType = isWhite ? 'Q' : 'q';
        else if (classList.includes('king')) pieceType = isWhite ? 'K' : 'k';

        if (pieceType) {
            // Get position from transform or style
            const style = piece.style.transform || piece.getAttribute('style') || '';
            const translateMatch = style.match(/translate\((\d+(?:\.\d+)?)px,\s*(\d+(?:\.\d+)?)px\)/);

            if (translateMatch) {
                let col = Math.round(parseFloat(translateMatch[1]) / squareSize);
                let row = Math.round(parseFloat(translateMatch[2]) / squareSize);

                if (flipped) {
                    col = 7 - col;
                    row = 7 - row;
                }

                if (col >= 0 && col < 8 && row >= 0 && row < 8) {
                    board[row][col] = pieceType;
                }
            }
        }
    });

    return board;
}

// ========== CASTLING RIGHTS LOGIC ==========

function detectCastlingRightsFromMoveList() {
    // Default to full rights - we will subtract based on evidence
    let rights = {
        whiteKingMoved: false,
        blackKingMoved: false
    };

    const site = detectSite(); // Global from boardDetector.js
    let moves = [];

    // Parse visual move list
    if (site === 'chesscom') {
        // Chess.com structure: .move-text-component or .node
        const nodes = document.querySelectorAll('.move-text-component, .node');

        nodes.forEach(node => {
            const san = node.textContent.trim();
            // Try to infer color from class or parent
            let isWhite = false;
            let isBlack = false;

            // Modern Chess.com classes
            if (node.classList.contains('move-text-component--white') || node.classList.contains('white')) isWhite = true;
            else if (node.classList.contains('move-text-component--black') || node.classList.contains('black')) isBlack = true;

            // Heuristic: If we can't find class, we might be looking at a raw list.
            // For now, only process if we are sure, or just assume the SAN tells enough?
            // "Ke2" is White if it's white's turn? No... 
            // BUT: "1." usually precedes white.

            if (isWhite || isBlack) {
                moves.push({ san, color: isWhite ? 'w' : 'b' });
            }
        });

    } else if (site === 'lichess') {
        // Lichess structure: <kwdb> inside <rm6>
        const nodes = document.querySelectorAll('kwdb'); // Moves usually here

        nodes.forEach((node, index) => {
            const san = node.textContent.trim();
            // Lichess moves are strictly linear: White, Black, White...
            const isWhite = (index % 2 === 0);
            moves.push({ san, color: isWhite ? 'w' : 'b' });
        });
    }

    // Analyze Moves
    moves.forEach(m => {
        // Clean SAN (remove check/mate checks +, #)
        const san = m.san.replace(/[+#?!=]/g, '');

        if (m.color === 'w') {
            if (san.startsWith('K') || san === 'O-O' || san === 'O-O-O') {
                rights.whiteKingMoved = true;
            }
        } else {
            if (san.startsWith('K') || san === 'O-O' || san === 'O-O-O') {
                rights.blackKingMoved = true;
            }
        }
    });

    // Build Castling String
    let castling = '';

    if (!rights.whiteKingMoved) castling += 'KQ';
    if (!rights.blackKingMoved) castling += 'kq';

    return castling || '-';
}

function boardToFen(board) {
    let fen = '';

    for (let row = 0; row < 8; row++) {
        let empty = 0;
        for (let col = 0; col < 8; col++) {
            const piece = board[row][col];
            if (piece) {
                if (empty > 0) {
                    fen += empty;
                    empty = 0;
                }
                fen += piece;
            } else {
                empty++;
            }
        }
        if (empty > 0) fen += empty;
        if (row < 7) fen += '/';
    }

    // Detect whose turn it is using state-based logic
    const activeColor = detectActiveColor(fen); // 'fen' here is just pieces

    // Castling logic: use DOM history if available, else standard fallback
    let castling = "-";

    // Check using our new move list parser
    try {
        castling = detectCastlingRightsFromMoveList();
    } catch (e) {
        // console.log('[Chess Analyzer] Castling detection failed:', e);
        // Fallback to naive check if parser crashes
        const START_POSITION = "rnbqkbnr/pppppppp/8/8/8/8/PPPP1PPP/RNBQKBNR";
        castling = (fen === START_POSITION) ? "KQkq" : "-";
    }

    fen += ` ${activeColor} ${castling} - 0 1`;

    // console.log('[Chess Analyzer] FEN active color:', activeColor);

    return fen;
}

function getCurrentFen() {
    const site = detectSite(); // from boardDetector.js
    const now = Date.now();

    // Strategy 1: JS Object State (Fastest & Most Reliable)
    if (gameState.source === 'JS_OBJECT' && (now - gameState.lastUpdate < 2000)) {
        // console.log('[Chess Analyzer] Using JS Object State');

        // Add active color if missing from simple FENs (Lichess sometimes sends without counters)
        let fen = gameState.fen;
        // Basic validation - ensure FEN has at least 1 section
        if (fen && fen.split(' ').length >= 1) {
            // Should ideally rely on backend to normalize, but we can do a quick check
            // If full FEN, return it.
            return fen;
        }
    }

    // Strategy 2: DOM Parsing (Fallback)
    // console.log('[Chess Analyzer] Fallback to DOM parsing');
    let board;

    if (site === 'chesscom') {
        board = parseChessComBoard();
    } else if (site === 'lichess') {
        board = parseLichessBoard();
    } else {
        return null;
    }

    return boardToFen(board);
}
