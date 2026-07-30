import { QueryClient } from "@tanstack/react-query";

import { isForbiddenError } from "./errors";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => !isForbiddenError(error) && failureCount < 1,
      refetchOnReconnect: false,
      refetchOnWindowFocus: false,
    },
  },
});
