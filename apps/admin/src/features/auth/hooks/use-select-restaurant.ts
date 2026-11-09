import { useMutation } from "@tanstack/react-query";

import { trpc } from "~/lib/trpc";
import { useBranchStore } from "~/shared/stores/branch-store";

export function useSelectRestaurant() {
  return useMutation({
    ...trpc.auth.selectRestaurant.mutationOptions(),
    onSuccess: () => {
      useBranchStore.getState().resetSelectedBranchId();
      // The session now points at another restaurant. queryClient.clear() leaves mounted observers on the removed
      // queries, so pages kept the old data and pollers kept hitting old branch ids; a fresh load drops all of it.
      window.location.assign("/");
    },
  });
}
