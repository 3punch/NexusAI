import type { ExecutedNotebook, NotebookCell, NotebookOutput } from "../api/notebooks-api";

interface Props {
  notebook: ExecutedNotebook;
}

function sourceText(source: string[] | string): string {
  return Array.isArray(source) ? source.join("") : source;
}

function outputText(output: NotebookOutput): string {
  return Array.isArray(output.text) ? output.text.join("") : (output.text ?? "");
}

/**
 * Renders an EXECUTED notebook (code + outputs) inside the app.
 * Markdown cells render as plain pre-wrapped text; outputs support streams,
 * text/plain, pandas-style text/html, base64 PNG plots, and error traces.
 */
export default function NotebookViewer({ notebook }: Props) {
  return (
    <div className="card">
      <h2>
        {notebook.file_name} — executed in {notebook.seconds}s
      </h2>
      <div className="stack">
        {notebook.cells.map((cell: NotebookCell, index: number) => {
          if (cell.cell_type === "markdown") {
            return (
              <pre className="nb-markdown" key={index}>
                {sourceText(cell.source)}
              </pre>
            );
          }
          return (
            <div key={index} className="nb-cell">
              <div className="muted nb-in">
                In [{cell.execution_count ?? " "}]:
              </div>
              <pre className="nb-code">{sourceText(cell.source)}</pre>
              {(cell.outputs ?? []).map((output, outputIndex) => {
                if (output.output_type === "error") {
                  return (
                    <pre className="nb-error" key={outputIndex}>
                      {output.ename}: {output.evalue}
                      {"\n"}
                      {(output.traceback ?? []).slice(-6).join("")}
                    </pre>
                  );
                }
                const data = output.data ?? {};
                if (typeof data["image/png"] === "string") {
                  return (
                    <img
                      key={outputIndex}
                      className="nb-plot"
                      alt="notebook plot"
                      src={`data:image/png;base64,${data["image/png"]}`}
                    />
                  );
                }
                if (typeof data["text/html"] === "string") {
                  return (
                    <div
                      key={outputIndex}
                      className="nb-html"
                      dangerouslySetInnerHTML={{ __html: data["text/html"] }}
                    />
                  );
                }
                const text =
                  output.output_type === "stream"
                    ? outputText(output)
                    : typeof data["text/plain"] === "string"
                      ? (data["text/plain"] as string)
                      : outputText(output);
                if (!text) return null;
                return (
                  <pre className="nb-out" key={outputIndex}>
                    {text}
                  </pre>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
