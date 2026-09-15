/**
 * Static catalogue of the ML notebooks committed at the repo root.
 *
 * The notebooks live in git (commit "Add ML notebooks from ML-Training repo")
 * and render natively on GitHub — this page is a thin catalogue that links
 * to those rendered files. Adding a notebook = commit the .ipynb and add one
 * line here.
 */

export interface NotebookInfo {
  fileName: string;
  title: string;
  description: string;
}

export const NOTEBOOKS: NotebookInfo[] = [
  {
    fileName: "Decision Tree.ipynb",
    title: "Decision Tree",
    description: "Decision-tree classifier walkthrough.",
  },
  {
    fileName: "GradientDescent.ipynb",
    title: "Gradient Descent",
    description: "Gradient-descent optimization fundamentals.",
  },
  {
    fileName: "iris Dataset-Scikit Learn.ipynb",
    title: "Iris Dataset — Scikit Learn",
    description: "Classification exercises on the classic iris dataset.",
  },
  {
    fileName: "LinearRegression.ipynb",
    title: "Linear Regression",
    description: "Linear-regression modeling and fitting.",
  },
  {
    fileName: "load_Iris Dataset-Scikit Learn.ipynb",
    title: "Load Iris Dataset — Scikit Learn",
    description: "Loading and preparing the iris dataset with scikit-learn.",
  },
  {
    fileName: "MultiVariable-Tips dataset-Seaborn.ipynb.ipynb",
    title: "MultiVariable Tips Dataset — Seaborn",
    description: "Multivariable analysis of the tips dataset with Seaborn.",
  },
  {
    fileName: "MultiVariable_LinearRegression.ipynb",
    title: "MultiVariable Linear Regression",
    description: "Multiple-feature linear regression.",
  },
  {
    fileName: "SearchHyperParameterTuning.ipynb",
    title: "Search & Hyperparameter Tuning",
    description: "Hyperparameter search and tuning strategies.",
  },
  {
    fileName: "Tips dataset-Seaborn.ipynb",
    title: "Tips Dataset — Seaborn",
    description: "Exploration and visualization of the tips dataset.",
  },
];

const REPO_BLOB_BASE = "https://github.com/3punch/NexusAI/blob/main";
const REPO_RAW_BASE = "https://raw.githubusercontent.com/3punch/NexusAI/main";

export function notebookGitHubUrl(fileName: string): string {
  return `${REPO_BLOB_BASE}/${encodeURIComponent(fileName)}`;
}

export function notebookRawUrl(fileName: string): string {
  return `${REPO_RAW_BASE}/${encodeURIComponent(fileName)}`;
}