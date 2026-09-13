/**
 * A small, dependency-free chess engine for the shayan chess-game project.
 *
 * Plain-script port of the original rules engine: no build step, no dependencies.
 * In the browser it is loaded as a classic script by play.html; in Node it is
 * required by tests/engine.test.cjs.
 *
 * Board layout: a flat array of 64 squares, index 0 = a8 (top-left) through
 * index 63 = h1 (bottom-right). White moves toward row 0.
 */

const FILES = "abcdefgh";
const PROMOTION_PIECES = ["queen", "rook", "bishop", "knight"];
const BACK_RANK = [
  "rook",
  "knight",
  "bishop",
  "queen",
  "king",
  "bishop",
  "knight",
  "rook",
];

const KNIGHT_DELTAS = [
  [-2, -1],
  [-2, 1],
  [-1, -2],
  [-1, 2],
  [1, -2],
  [1, 2],
  [2, -1],
  [2, 1],
];
const DIAGONAL_DIRS = [
  [-1, -1],
  [-1, 1],
  [1, -1],
  [1, 1],
];
const ORTHOGONAL_DIRS = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
];
const KING_DIRS = [...DIAGONAL_DIRS, ...ORTHOGONAL_DIRS];

const PIECE_VALUES = {
  pawn: 100,
  knight: 320,
  bishop: 330,
  rook: 500,
  queen: 900,
  king: 20000,
};

function rowOf(index) {
  return Math.floor(index / 8);
}

function colOf(index) {
  return index % 8;
}

function squareName(index) {
  return `${FILES[colOf(index)]}${8 - rowOf(index)}`;
}

function squareIndex(name) {
  const file = FILES.indexOf(name[0]);
  const rank = Number(name[1]);
  if (file < 0 || Number.isNaN(rank) || rank < 1 || rank > 8) {
    throw new Error(`Invalid square name: ${name}`);
  }
  return (8 - rank) * 8 + file;
}

function createInitialState() {
  const board = Array.from({ length: 64 }, () => null);
  for (let col = 0; col < 8; col += 1) {
    board[col] = { type: BACK_RANK[col], color: "black" };
    board[8 + col] = { type: "pawn", color: "black" };
    board[48 + col] = { type: "pawn", color: "white" };
    board[56 + col] = { type: BACK_RANK[col], color: "white" };
  }
  return {
    board,
    turn: "white",
    castling: {
      whiteKingSide: true,
      whiteQueenSide: true,
      blackKingSide: true,
      blackQueenSide: true,
    },
    enPassantTarget: null,
    fullmove: 1,
  };
}

function other(color) {
  return color === "white" ? "black" : "white";
}

function findKing(board, color) {
  const index = board.findIndex((piece) => piece && piece.type === "king" && piece.color === color);
  if (index < 0) throw new Error(`Missing ${color} king`);
  return index;
}

function isSquareAttacked(board, index, byColor) {
  const row = rowOf(index);
  const col = colOf(index);

  // Pawns: a white pawn on (row+1, col±1) attacks `index`; black the mirror.
  const pawnRow = byColor === "white" ? row + 1 : row - 1;
  if (pawnRow >= 0 && pawnRow < 8) {
    for (const dc of [-1, 1]) {
      const c = col + dc;
      if (c < 0 || c > 7) continue;
      const piece = board[pawnRow * 8 + c];
      if (piece && piece.color === byColor && piece.type === "pawn") return true;
    }
  }

  for (const [dr, dc] of KNIGHT_DELTAS) {
    const r = row + dr;
    const c = col + dc;
    if (r < 0 || r > 7 || c < 0 || c > 7) continue;
    const piece = board[r * 8 + c];
    if (piece && piece.color === byColor && piece.type === "knight") return true;
  }

  for (const [dr, dc] of KING_DIRS) {
    const r = row + dr;
    const c = col + dc;
    if (r < 0 || r > 7 || c < 0 || c > 7) continue;
    const piece = board[r * 8 + c];
    if (piece && piece.color === byColor && piece.type === "king") return true;
  }

  for (const [dr, dc] of DIAGONAL_DIRS) {
    let r = row + dr;
    let c = col + dc;
    while (r >= 0 && r < 8 && c >= 0 && c < 8) {
      const piece = board[r * 8 + c];
      if (piece) {
        if (piece.color === byColor && (piece.type === "bishop" || piece.type === "queen")) {
          return true;
        }
        break;
      }
      r += dr;
      c += dc;
    }
  }

  for (const [dr, dc] of ORTHOGONAL_DIRS) {
    let r = row + dr;
    let c = col + dc;
    while (r >= 0 && r < 8 && c >= 0 && c < 8) {
      const piece = board[r * 8 + c];
      if (piece) {
        if (piece.color === byColor && (piece.type === "rook" || piece.type === "queen")) {
          return true;
        }
        break;
      }
      r += dr;
      c += dc;
    }
  }

  return false;
}

function isInCheck(board, color) {
  return isSquareAttacked(board, findKing(board, color), other(color));
}

function pushPawnMoves(state, from, moves) {
  const piece = state.board[from];
  const direction = piece.color === "white" ? -1 : 1;
  const startRow = piece.color === "white" ? 6 : 1;
  const promotionRow = piece.color === "white" ? 0 : 7;
  const row = rowOf(from);
  const col = colOf(from);

  const oneAhead = (row + direction) * 8 + col;
  if (row + direction >= 0 && row + direction < 8 && !state.board[oneAhead]) {
    if (row + direction === promotionRow) {
      for (const promotion of PROMOTION_PIECES) {
        moves.push({
          from,
          to: oneAhead,
          piece: "pawn",
          captured: null,
          promotion,
          castle: null,
          enPassant: false,
        });
      }
    } else {
      moves.push({
        from,
        to: oneAhead,
        piece: "pawn",
        captured: null,
        promotion: null,
        castle: null,
        enPassant: false,
      });
      if (row === startRow) {
        const twoAhead = (row + 2 * direction) * 8 + col;
        if (!state.board[twoAhead]) {
          moves.push({
            from,
            to: twoAhead,
            piece: "pawn",
            captured: null,
            promotion: null,
            castle: null,
            enPassant: false,
          });
        }
      }
    }
  }

  for (const dc of [-1, 1]) {
    const c = col + dc;
    const r = row + direction;
    if (c < 0 || c > 7 || r < 0 || r > 7) continue;
    const target = r * 8 + c;
    const occupant = state.board[target];
    if (occupant && occupant.color !== piece.color) {
      if (r === promotionRow) {
        for (const promotion of PROMOTION_PIECES) {
          moves.push({
            from,
            to: target,
            piece: "pawn",
            captured: occupant.type,
            promotion,
            castle: null,
            enPassant: false,
          });
        }
      } else {
        moves.push({
          from,
          to: target,
          piece: "pawn",
          captured: occupant.type,
          promotion: null,
          castle: null,
          enPassant: false,
        });
      }
    } else if (!occupant && target === state.enPassantTarget) {
      moves.push({
        from,
        to: target,
        piece: "pawn",
        captured: "pawn",
        promotion: null,
        castle: null,
        enPassant: true,
      });
    }
  }
}

function pushStepperMoves(state, from, deltas, type, moves) {
  const piece = state.board[from];
  const row = rowOf(from);
  const col = colOf(from);
  for (const [dr, dc] of deltas) {
    const r = row + dr;
    const c = col + dc;
    if (r < 0 || r > 7 || c < 0 || c > 7) continue;
    const target = r * 8 + c;
    const occupant = state.board[target];
    if (!occupant) {
      moves.push({
        from,
        to: target,
        piece: type,
        captured: null,
        promotion: null,
        castle: null,
        enPassant: false,
      });
    } else if (occupant.color !== piece.color) {
      moves.push({
        from,
        to: target,
        piece: type,
        captured: occupant.type,
        promotion: null,
        castle: null,
        enPassant: false,
      });
    }
  }
}

function pushSliderMoves(state, from, dirs, type, moves) {
  const piece = state.board[from];
  const row = rowOf(from);
  const col = colOf(from);
  for (const [dr, dc] of dirs) {
    let r = row + dr;
    let c = col + dc;
    while (r >= 0 && r < 8 && c >= 0 && c < 8) {
      const target = r * 8 + c;
      const occupant = state.board[target];
      if (!occupant) {
        moves.push({
          from,
          to: target,
          piece: type,
          captured: null,
          promotion: null,
          castle: null,
          enPassant: false,
        });
      } else {
        if (occupant.color !== piece.color) {
          moves.push({
            from,
            to: target,
            piece: type,
            captured: occupant.type,
            promotion: null,
            castle: null,
            enPassant: false,
          });
        }
        break;
      }
      r += dr;
      c += dc;
    }
  }
}

function pushCastlingMoves(state, from, moves) {
  const piece = state.board[from];
  if (piece.type !== "king") return;
  const row = rowOf(from);
  const col = colOf(from);
  if (col !== 4) return; // king must sit on its starting file
  const homeRow = piece.color === "white" ? 7 : 0;
  if (row !== homeRow) return;

  const enemy = other(piece.color);
  const rights = state.castling;
  const kingSide = piece.color === "white" ? rights.whiteKingSide : rights.blackKingSide;
  const queenSide = piece.color === "white" ? rights.whiteQueenSide : rights.blackQueenSide;

  if (
    kingSide &&
    !state.board[homeRow * 8 + 5] &&
    !state.board[homeRow * 8 + 6] &&
    state.board[homeRow * 8 + 7]?.type === "rook" &&
    state.board[homeRow * 8 + 7]?.color === piece.color &&
    !isSquareAttacked(state.board, from, enemy) &&
    !isSquareAttacked(state.board, homeRow * 8 + 5, enemy) &&
    !isSquareAttacked(state.board, homeRow * 8 + 6, enemy)
  ) {
    moves.push({
      from,
      to: homeRow * 8 + 6,
      piece: "king",
      captured: null,
      promotion: null,
      castle: "king",
      enPassant: false,
    });
  }

  if (
    queenSide &&
    !state.board[homeRow * 8 + 1] &&
    !state.board[homeRow * 8 + 2] &&
    !state.board[homeRow * 8 + 3] &&
    state.board[homeRow * 8]?.type === "rook" &&
    state.board[homeRow * 8]?.color === piece.color &&
    !isSquareAttacked(state.board, from, enemy) &&
    !isSquareAttacked(state.board, homeRow * 8 + 3, enemy) &&
    !isSquareAttacked(state.board, homeRow * 8 + 2, enemy)
  ) {
    moves.push({
      from,
      to: homeRow * 8 + 2,
      piece: "king",
      captured: null,
      promotion: null,
      castle: "queen",
      enPassant: false,
    });
  }
}

function pseudoLegalMoves(state, from) {
  const piece = state.board[from];
  if (!piece || piece.color !== state.turn) return [];
  const moves = [];
  switch (piece.type) {
    case "pawn":
      pushPawnMoves(state, from, moves);
      break;
    case "knight":
      pushStepperMoves(state, from, KNIGHT_DELTAS, "knight", moves);
      break;
    case "bishop":
      pushSliderMoves(state, from, DIAGONAL_DIRS, "bishop", moves);
      break;
    case "rook":
      pushSliderMoves(state, from, ORTHOGONAL_DIRS, "rook", moves);
      break;
    case "queen":
      pushSliderMoves(state, from, KING_DIRS, "queen", moves);
      break;
    case "king":
      pushStepperMoves(state, from, KING_DIRS, "king", moves);
      pushCastlingMoves(state, from, moves);
      break;
  }
  return moves;
}

function applyMove(state, move) {
  const board = state.board.slice();
  const piece = board[move.from];
  if (!piece) throw new Error(`No piece on ${squareName(move.from)}`);

  board[move.from] = null;
  board[move.to] = move.promotion ? { type: move.promotion, color: piece.color } : piece;

  if (move.enPassant) {
    const capturedRow = piece.color === "white" ? rowOf(move.to) + 1 : rowOf(move.to) - 1;
    board[capturedRow * 8 + colOf(move.to)] = null;
  }

  if (move.castle) {
    const homeRow = rowOf(move.from);
    if (move.castle === "king") {
      board[homeRow * 8 + 5] = board[homeRow * 8 + 7];
      board[homeRow * 8 + 7] = null;
    } else {
      board[homeRow * 8 + 3] = board[homeRow * 8];
      board[homeRow * 8] = null;
    }
  }

  const castling = { ...state.castling };
  if (piece.type === "king") {
    if (piece.color === "white") {
      castling.whiteKingSide = false;
      castling.whiteQueenSide = false;
    } else {
      castling.blackKingSide = false;
      castling.blackQueenSide = false;
    }
  }
  if (move.from === 63 || move.to === 63) castling.whiteKingSide = false;
  if (move.from === 56 || move.to === 56) castling.whiteQueenSide = false;
  if (move.from === 7 || move.to === 7) castling.blackKingSide = false;
  if (move.from === 0 || move.to === 0) castling.blackQueenSide = false;

  const isDoublePawnPush =
    piece.type === "pawn" && Math.abs(rowOf(move.to) - rowOf(move.from)) === 2;
  const enPassantTarget = isDoublePawnPush ? (move.from + move.to) / 2 : null;

  return {
    board,
    turn: other(state.turn),
    castling,
    enPassantTarget,
    fullmove: state.turn === "black" ? state.fullmove + 1 : state.fullmove,
  };
}

function legalMoves(state, from) {
  const sources = from === undefined ? Array.from({ length: 64 }, (_, index) => index) : [from];
  const moves = [];
  for (const source of sources) {
    for (const move of pseudoLegalMoves(state, source)) {
      const next = applyMove(state, move);
      if (!isInCheck(next.board, state.turn)) moves.push(move);
    }
  }
  return moves;
}

function getStatus(state) {
  const inCheck = isInCheck(state.board, state.turn);
  if (legalMoves(state).length > 0) {
    return { inCheck, result: "in-progress", winner: null };
  }
  if (inCheck) {
    return { inCheck: true, result: "checkmate", winner: other(state.turn) };
  }
  return { inCheck: false, result: "stalemate", winner: null };
}

const SAN_LETTERS = {
  pawn: "",
  knight: "N",
  bishop: "B",
  rook: "R",
  queen: "Q",
  king: "K",
};

function moveToSan(state, move) {
  let san;
  if (move.castle) {
    san = move.castle === "king" ? "O-O" : "O-O-O";
  } else if (move.piece === "pawn") {
    san = move.captured ? `${FILES[colOf(move.from)]}x${squareName(move.to)}` : squareName(move.to);
    if (move.promotion) san += `=${SAN_LETTERS[move.promotion]}`;
  } else {
    san = SAN_LETTERS[move.piece];
    const rivals = legalMoves(state).filter(
      (candidate) =>
        candidate.piece === move.piece && candidate.to === move.to && candidate.from !== move.from,
    );
    if (rivals.length > 0) {
      const sharesFile = rivals.some((candidate) => colOf(candidate.from) === colOf(move.from));
      const sharesRank = rivals.some((candidate) => rowOf(candidate.from) === rowOf(move.from));
      if (!sharesFile) san += FILES[colOf(move.from)];
      else if (!sharesRank) san += String(8 - rowOf(move.from));
      else san += squareName(move.from);
    }
    if (move.captured) san += "x";
    san += squareName(move.to);
  }

  const next = applyMove(state, move);
  if (isInCheck(next.board, next.turn)) {
    san += legalMoves(next).length > 0 ? "+" : "#";
  }
  return san;
}

function centrality(index) {
  const row = rowOf(index);
  const col = colOf(index);
  return 3.5 - Math.abs(row - 3.5) + (3.5 - Math.abs(col - 3.5));
}

function positionalBonus(piece, index) {
  switch (piece.type) {
    case "pawn": {
      const advance = piece.color === "white" ? 6 - rowOf(index) : rowOf(index) - 1;
      return advance * 4 + centrality(index);
    }
    case "knight":
      return centrality(index) * 8;
    case "bishop":
      return centrality(index) * 4;
    case "queen":
      return centrality(index) * 2;
    default:
      return 0;
  }
}

/** Static evaluation from the perspective of the side to move. */
function evaluate(state) {
  let score = 0;
  for (let index = 0; index < 64; index += 1) {
    const piece = state.board[index];
    if (!piece) continue;
    const value = PIECE_VALUES[piece.type] + positionalBonus(piece, index);
    score += piece.color === "white" ? value : -value;
  }
  return state.turn === "white" ? score : -score;
}

function moveOrderKey(move) {
  let key = 0;
  if (move.captured) key += PIECE_VALUES[move.captured];
  if (move.promotion) key += PIECE_VALUES[move.promotion] / 2;
  return key;
}

function negamax(state, depth, alpha, beta) {
  if (depth === 0) return evaluate(state);
  const moves = legalMoves(state).sort((a, b) => moveOrderKey(b) - moveOrderKey(a));
  if (moves.length === 0) {
    // Being mated sooner is worse; more depth remaining at the mate means it happened earlier.
    return isInCheck(state.board, state.turn) ? -100000 - depth : 0;
  }
  let best = -Infinity;
  let bound = alpha;
  for (const move of moves) {
    const score = -negamax(applyMove(state, move), depth - 1, -beta, -bound);
    if (score > best) best = score;
    if (best > bound) bound = best;
    if (bound >= beta) break;
  }
  return best;
}

/**
 * Pick a move for the side to play with an alpha-beta search.
 * Near ties are broken randomly so games differ between rounds.
 */
function chooseComputerMove(state, depth = 3) {
  const moves = legalMoves(state).sort((a, b) => moveOrderKey(b) - moveOrderKey(a));
  if (moves.length === 0) return null;

  let best = -Infinity;
  let candidates = [];
  let alpha = -Infinity;
  for (const move of moves) {
    const score = -negamax(applyMove(state, move), depth - 1, -Infinity, -alpha);
    if (score > best + 10) {
      best = score;
      candidates = [move];
    } else if (score >= best - 10) {
      candidates.push(move);
    }
    if (best > alpha) alpha = best;
  }

  if (candidates.length === 0) candidates = [moves[0]];
  return candidates[Math.floor(Math.random() * candidates.length)];
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    PIECE_VALUES,
    rowOf,
    colOf,
    squareName,
    squareIndex,
    createInitialState,
    other,
    findKing,
    isSquareAttacked,
    isInCheck,
    applyMove,
    legalMoves,
    getStatus,
    moveToSan,
    chooseComputerMove,
  };
}



