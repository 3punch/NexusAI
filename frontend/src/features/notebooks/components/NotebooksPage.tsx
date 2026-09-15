import {
  NOTEBOOKS,
  notebookGitHubUrl,
  notebookRawUrl,
} from "../notebooks-data";

/**
 * Catalogue page for the ML notebooks committed to this repo.
 *
 * The notebooks are git-tracked files at the repo root; GitHub renders
 * .ipynb natively, so "Open" takes you to the polished view and "Download"
 * fetches the raw .ipynb for running locally in Jupyter. This page is thin
 * by design — the notebooks themselves are not embedded in the app.
 */
export default function NotebooksPage() {
  return (
    <div className="card">
      <h2>ML Notebooks</h2>
      <p className="muted">
        Your machine-learning experiments, committed to this project. Open the
        rendered notebook on GitHub, or download the .ipynb and run it
        locally with Jupyter.
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
  );
}