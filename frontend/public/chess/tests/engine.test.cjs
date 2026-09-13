const assert = require("node:assert/strict");

const {
  applyMove,
  chooseComputerMove,
  createInitialState,
  getStatus,
  legalMoves,
  moveToSan,
  squareIndex,
  squareName,
} = require("../engine.js");

let passed = 0;

function test(name, fn) {
  try {
    fn();
    passed += 1;
    console.log(`ok - ${name}`);
  } catch (error) {
    console.error(`FAIL - ${name}`);
    console.error(error);
    process.exitCode = 1;
  }
}

function findMove(state, from, to, promotion) {
  const candidates = legalMoves(state).filter(
    (move) => squareName(move.from) === from && squareName(move.to) === to,
  );
  assert.ok(candidates.length > 0, `move ${from}-${to}`);
  if (promotion) {
    const promoted = candidates.find((move) => move.promotion === promotion);
    assert.ok(promoted, `promotion ${from}-${to}=${promotion}`);
    return promoted;
  }
  return candidates[0];
}

function playMoves(state, ...pairs) {
  let next = state;
  for (const [from, to, promotion] of pairs) {
    next = applyMove(next, findMove(next, from, to, promotion));
  }
  return next;
}

function sameMove(a, b) {
  return (
    a.from === b.from &&
    a.to === b.to &&
    a.piece === b.piece &&
    a.captured === b.captured &&
    a.promotion === b.promotion &&
    a.castle === b.castle &&
    a.enPassant === b.enPassant
  );
}

test("maps square indices to algebraic names", () => {
  assert.equal(squareName(0), "a8");
  assert.equal(squareName(63), "h1");
  assert.equal(squareName(squareIndex("e2")), "e2");
  assert.equal(squareIndex("e4"), 36);
});

test("offers 20 legal moves from the initial position", () => {
  assert.equal(legalMoves(createInitialState()).length, 20);
});

test("sets the en passant target after a double pawn push", () => {
  const state = playMoves(createInitialState(), ["e2", "e4"]);
  assert.equal(state.enPassantTarget, squareIndex("e3"));
});

test("captures en passant and removes the passed pawn", () => {
  const state = playMoves(
    createInitialState(),
    ["e2", "e4"],
    ["a7", "a6"],
    ["e4", "e5"],
    ["d7", "d5"],
  );
  assert.equal(state.board[squareIndex("d5")].type, "pawn");

  const captured = playMoves(state, ["e5", "d6"]);
  assert.equal(captured.board[squareIndex("d5")], null);
  assert.equal(captured.board[squareIndex("d6")].type, "pawn");
});

test("castles kingside and moves the rook", () => {
  const state = playMoves(
    createInitialState(),
    ["e2", "e4"],
    ["e7", "e5"],
    ["g1", "f3"],
    ["b8", "c6"],
    ["f1", "c4"],
    ["f8", "c5"],
  );
  const castling = legalMoves(state).find((move) => move.castle === "king");
  assert.ok(castling, "kingside castling is available");

  const castled = applyMove(state, castling);
  assert.equal(castled.board[squareIndex("g1")].type, "king");
  assert.equal(castled.board[squareIndex("f1")].type, "rook");
  assert.equal(castled.board[squareIndex("e1")], null);
  assert.equal(castled.castling.whiteKingSide, false);
});

test("detects fool's mate as checkmate", () => {
  const before = playMoves(createInitialState(), ["f2", "f3"], ["e7", "e5"], ["g2", "g4"]);
  const queenMove = findMove(before, "d8", "h4");
  const state = applyMove(before, queenMove);

  const status = getStatus(state);
  assert.equal(status.result, "checkmate");
  assert.equal(status.winner, "black");
  assert.equal(moveToSan(before, queenMove), "Qh4#");
});

test("detects stalemate", () => {
  const board = Array.from({ length: 64 }, () => null);
  board[squareIndex("h8")] = { type: "king", color: "black" };
  board[squareIndex("f7")] = { type: "queen", color: "white" };
  board[squareIndex("g6")] = { type: "king", color: "white" };
  const state = {
    board,
    turn: "black",
    castling: {
      whiteKingSide: false,
      whiteQueenSide: false,
      blackKingSide: false,
      blackQueenSide: false,
    },
    enPassantTarget: null,
    fullmove: 1,
  };
  assert.deepStrictEqual(getStatus(state), { inCheck: false, result: "stalemate", winner: null });
});

test("promotes a pawn and offers all four choices", () => {
  const board = Array.from({ length: 64 }, () => null);
  board[squareIndex("e7")] = { type: "pawn", color: "white" };
  board[squareIndex("a1")] = { type: "king", color: "white" };
  board[squareIndex("h8")] = { type: "king", color: "black" };
  const state = {
    board,
    turn: "white",
    castling: {
      whiteKingSide: false,
      whiteQueenSide: false,
      blackKingSide: false,
      blackQueenSide: false,
    },
    enPassantTarget: null,
    fullmove: 1,
  };

  const promotions = legalMoves(state).filter((move) => move.from === squareIndex("e7"));
  assert.equal(promotions.length, 4);

  const promoted = applyMove(state, findMove(state, "e7", "e8", "queen"));
  assert.equal(promoted.board[squareIndex("e8")].type, "queen");
  assert.equal(promoted.board[squareIndex("e8")].color, "white");
});

test("computer picks a legal move", () => {
  const initial = createInitialState();
  const move = chooseComputerMove(initial, 2);
  assert.ok(move, "computer returns a move");
  assert.ok(legalMoves(initial).some((candidate) => sameMove(candidate, move)));
});

if (process.exitCode !== 1) {
  console.log(`${passed} engine tests passed`);
}
