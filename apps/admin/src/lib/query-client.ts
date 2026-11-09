import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query";

import { isForbiddenError } from "./errors";
import { notifyError } from "./notifications";

export const queryClient = new QueryClient({
  mutationCache: new MutationCache({ onError: notifyError }),
  queryCache: new QueryCache({
    onError: (error, query) => {
      // FORBIDDEN on a read either redirects (no active restaurant) or renders RouteErrorState; a toast only duplicates it.
      if (query.state.data === undefined && !isForbiddenError(error)) notifyError(error);
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
