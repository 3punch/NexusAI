import {
  NOTEBOOKS,
  notebookGitHubUrl,
  notebookRawUrl,
} from "../notebooks-data";

import { formatApiError } from "../../../lib/api-client";
import { useRunNotebook } from "../hooks/use-run-notebook";
import NotebookViewer from "./NotebookViewer";

/**
 * Catalogue page for the ML notebooks committed to this repo.
 *
 * The notebooks are git-tracked files at the repo root; GitHub renders
 * .ipynb natively, so "Open" takes you to the polished view and "Download"
 * fetches the raw .ipynb for running locally in Jupyter. This page is thin
 * by design — the notebooks themselves are not embedded in the app.
 */
export default function NotebooksPage() {
  const runNotebook = useRunNotebook();

  return (
    <>
      <div className="card">
      <h2>ML Notebooks</h2>
      <p className="muted">
        Your machine-learning experiments, committed to this project. Open the
        rendered notebook on GitHub, download the .ipynb for Jupyter — or Run
        it right here: execution happens in this app's backend on your own
        machine (first run can take a minute while the kernel starts).
      </p>
      <div className="stack">
        {NOTEBOOKS.map((notebook) => (
          <div className="task-item" key={notebook.fileName}>
            <div>
              <div>{notebook.title}</div>
              <div className="muted">{notebook.fileName}</div>
              {notebook.description && (
                <div className="muted">{notebook.description}</div>
              )}
            </div>
            <div className="row">
              <button
                type="button"
                className="secondary"
                disabled={runNotebook.isPending}
                onClick={() => runNotebook.mutate(notebook.fileName)}
              >
                {runNotebook.isPending && runNotebook.variables === notebook.fileName
                  ? "Running…"
                  : "Run"}
              </button>
              <a
                className="external-link"
                href={notebookGitHubUrl(notebook.fileName)}
                target="_blank"
                rel="noreferrer"
              >
                Open
              </a>
              <a
                className="external-link"
                href={notebookRawUrl(notebook.fileName)}
                target="_blank"
                rel="noreferrer"
              >
                Download
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
      {runNotebook.isError && (
        <div className="card">
          <div className="error-text">{formatApiError(runNotebook.error)}</div>
        </div>
      )}
      {runNotebook.data && <NotebookViewer notebook={runNotebook.data} />}
    </>
  );
}