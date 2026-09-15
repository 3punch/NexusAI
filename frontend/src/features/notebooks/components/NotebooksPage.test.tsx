// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

import { NOTEBOOKS, notebookGitHubUrl } from "../notebooks-data";
import NotebooksPage from "./NotebooksPage";

describe("NotebooksPage", () => {
  afterEach(() => cleanup());

  it("lists every notebook with a GitHub render link", () => {
    render(<NotebooksPage />);
    const openLinks = screen.getAllByRole("link", { name: "Open" });
    expect(openLinks).toHaveLength(NOTEBOOKS.length);
    expect(openLinks[0].getAttribute("href")).toBe(
      notebookGitHubUrl("Decision Tree.ipynb"),
    );
  });

  it("provides a raw download link per notebook", () => {
    render(<NotebooksPage />);
    const downloadLinks = screen.getAllByRole("link", { name: "Download" });
    expect(downloadLinks).toHaveLength(NOTEBOOKS.length);
    expect(downloadLinks[0].getAttribute("href")).toContain(
      "raw.githubusercontent.com/3punch/NexusAI/main/Decision%20Tree.ipynb",
    );
  });
});