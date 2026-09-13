/**
 * Thin integration surface for the ported chess game.
 *
 * The game is the UNTOUCHED ForgeFlow "shayan chess-game" implementation
 * (engine.js + play.html), served as static files from /chess/ (see
 * frontend/public/chess). This page adds only a route, a nav link, and an
 * iframe wrapper — the same "no per-project logic in Core" contract the
 * game's README documents for its original platform.
 */
export default function ChessPage() {
  return (
    <div className="card">
      <h2>Chess</h2>
      <p className="muted">
        Full-rules chess, ported byte-for-byte from the ForgeFlow
        shayan-chess-game project. Play against the computer or a friend,
        with move history in SAN notation.
      </p>
      <iframe className="chess-frame" src="/chess/play.html" title="Chess game" />
    </div>
  );
}
