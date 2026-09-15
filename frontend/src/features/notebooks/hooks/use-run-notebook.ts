import { useMutation } from "@tanstack/react-query";

import { notebooksApi } from "../api/notebooks-api";

export function useRunNotebook() {
  return useMutation({
    mutationFn: (fileName: string) => notebooksApi.run(fileName),
  });
}
