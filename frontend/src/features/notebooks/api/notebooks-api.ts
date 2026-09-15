import { apiFetch } from "../../../lib/api-client";

export interface NotebookOutput {
  output_type: string;
  name?: string;
  text?: string[] | string;
  data?: Record<string, unknown>;
  ename?: string;
  evalue?: string;
  traceback?: string[];
}

export interface NotebookCell {
  cell_type: string;
  source: string[] | string;
  outputs?: NotebookOutput[];
  execution_count?: number | null;
}

export interface ExecutedNotebook {
  file_name: string;
  seconds: number;
  cells: NotebookCell[];
}

/**
 * "Run" executes a repo-root .ipynb in the backend (nbclient + ipykernel)
 * and returns the executed cells — the same machinery Jupyter uses.
 */
export const notebooksApi = {
  run: (fileName: string) =>
    apiFetch<ExecutedNotebook>("/notebooks/run", {
      method: "POST",
      body: { file_name: fileName },
    }),
};
