// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

import ChessPage from "./ChessPage";

describe("ChessPage", () => {
  afterEach(() => cleanup());

  it("embeds the untouched chess game from /chess/play.html", () => {
    render(<ChessPage />);
    const frame = screen.getByTitle("Chess game") as HTMLIFrameElement;
    expect(frame.tagName).toBe("IFRAME");
    expect(frame.getAttribute("src")).toBe("/chess/play.html");
  });
});
