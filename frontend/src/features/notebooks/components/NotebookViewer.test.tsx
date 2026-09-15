// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

import type { ExecutedNotebook } from "../api/notebooks-api";
import NotebookViewer from "./NotebookViewer";

const executed: ExecutedNotebook = {
  file_name: "tiny.ipynb",
  seconds: 1.2,
  cells: [
    { cell_type: "markdown", source: ["# Decision Tree Regressor"] },
    {
      cell_type: "code",
      source: ["print('running the notebook')"],
      execution_count: 1,
      outputs: [
        { output_type: "stream", name: "stdout", text: ["run ok\n"] },
      ],
    },
    {
      cell_type: "code",
      source: ["1/0"],
      execution_count: 2,
      outputs: [
        {
          output_type: "error",
          ename: "ZeroDivisionError",
          evalue: "division by zero",
          traceback: ["trace line"],
        },
      ],
    },
    {
      cell_type: "code",
      source: ["plt.show()"],
      execution_count: 3,
      outputs: [
        { output_type: "display_data", data: { "image/png": "abc123" } },
      ],
    },
  ],
};

describe("NotebookViewer", () => {
  afterEach(() => cleanup());

  it("renders markdown, code, stream output, errors, and plots", () => {
    render(<NotebookViewer notebook={executed} />);
    expect(screen.getByText(/Decision Tree Regressor/)).toBeTruthy();
    expect(screen.getByText(/print\('running the notebook'\)/)).toBeTruthy();
    expect(screen.getByText(/run ok/)).toBeTruthy();
    expect(screen.getByText(/ZeroDivisionError: division by zero/)).toBeTruthy();
    const plot = screen.getByAltText("notebook plot") as HTMLImageElement;
    expect(plot.src).toContain("data:image/png;base64,abc123");
    expect(screen.getByText(/executed in 1.2s/)).toBeTruthy();
  });
});