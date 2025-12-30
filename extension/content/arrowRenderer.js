// Chess Analyzer - Arrow Renderer Module
// Responsibilities: SVG Overlay, Arrow Drawing, Coordinate Mapping

let arrowOverlay = null;

function createArrowOverlay() {
    const board = getBoard();
    if (!board) return null;

    // Remove existing overlay
    removeArrows();

    // Get actual board dimensions
    const boardRect = board.getBoundingClientRect();

    const overlay = document.createElement('div');
    overlay.id = 'chess-analyzer-overlay';
    overlay.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        width: ${boardRect.width}px;
        height: ${boardRect.height}px;
        pointer-events: none;
        z-index: 9999;
    `;

    // Use viewBox for proper coordinate mapping
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 800 800');
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '100%');
    svg.style.cssText = 'position: absolute; top: 0; left: 0; width: 100%; height: 100%;';

    // Arrow marker definition
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    const marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
    marker.setAttribute('id', 'chess-arrowhead');
    marker.setAttribute('markerWidth', '4');
    marker.setAttribute('markerHeight', '4');
    marker.setAttribute('refX', '2.5');
    marker.setAttribute('refY', '2');
    marker.setAttribute('orient', 'auto');

    const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    polygon.setAttribute('points', '0 0, 4 2, 0 4');
    polygon.setAttribute('fill', '#15b53a');

    marker.appendChild(polygon);
    defs.appendChild(marker);
    svg.appendChild(defs);
    overlay.appendChild(svg);

    // Append overlay directly to the board element
    // Make sure board has relative/absolute positioning
    const boardPosition = getComputedStyle(board).position;
    if (boardPosition === 'static') {
        board.style.position = 'relative';
    }

    board.appendChild(overlay);
    arrowOverlay = overlay;

    return overlay;
}

function squareToCoords(square) {
    // Map square (e.g., 'e2') to coordinates in 0-800 range (viewBox)
    const col = square.charCodeAt(0) - 97; // a=0, h=7
    const row = parseInt(square[1]) - 1;    // 1=0, 8=7

    const squareSize = 100; // 800/8 = 100
    const flipped = isBoardFlipped();

    let x, y;
    if (flipped) {
        x = (7 - col) * squareSize + squareSize / 2;
        y = row * squareSize + squareSize / 2;
    } else {
        x = col * squareSize + squareSize / 2;
        y = (7 - row) * squareSize + squareSize / 2;
    }

    return { x, y };
}

function drawArrow(from, to) {
    const board = getBoard();
    if (!board) return;

    const overlay = createArrowOverlay();
    if (!overlay) return;

    const svg = overlay.querySelector('svg');

    const fromCoords = squareToCoords(from);
    const toCoords = squareToCoords(to);

    // Shorten arrow slightly so it doesn't overlap the arrowhead
    const dx = toCoords.x - fromCoords.x;
    const dy = toCoords.y - fromCoords.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    const shortenBy = 15;
    const endX = toCoords.x - (dx / len) * shortenBy;
    const endY = toCoords.y - (dy / len) * shortenBy;

    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', fromCoords.x);
    line.setAttribute('y1', fromCoords.y);
    line.setAttribute('x2', endX);
    line.setAttribute('y2', endY);
    line.setAttribute('stroke', '#15b53a');
    line.setAttribute('stroke-width', '15');
    line.setAttribute('stroke-opacity', '0.85');
    line.setAttribute('stroke-linecap', 'round');
    line.setAttribute('marker-end', 'url(#chess-arrowhead)');

    svg.appendChild(line);

    // console.log(`[Chess Analyzer] Arrow drawn: ${from} → ${to}`);
}

function removeArrows() {
    const existing = document.getElementById('chess-analyzer-overlay');
    if (existing) {
        existing.remove();
    }
    arrowOverlay = null;
}
