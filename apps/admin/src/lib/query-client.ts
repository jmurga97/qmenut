import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query";

import { isForbiddenError } from "./errors";
import { notifyError } from "./notifications";

export const queryClient = new QueryClient({
  mutationCache: new MutationCache({ onError: notifyError }),
  queryCache: new QueryCache({
    onError: (error, query) => {
      if (query.state.data === undefined) notifyError(error);
    },
  }),
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => !isForbiddenError(error) && failureCount < 1,
      refetchOnReconnect: false,
      refetchOnWindowFocus: false,
    },
  },
});
