import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useRouter } from "@tanstack/react-router";

import { trpc } from "~/lib/trpc";
import { useBranchStore } from "~/shared/stores/branch-store";

interface UseSelectRestaurantInput {
  redirectTo?: string;
}

export function useSelectRestaurant({ redirectTo = "/" }: UseSelectRestaurantInput = {}) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const router = useRouter();

  return useMutation({
    ...trpc.auth.selectRestaurant.mutationOptions(),
    onSuccess: async () => {
      queryClient.clear();
      useBranchStore.getState().resetSelectedBranchId();
      await navigate({ to: redirectTo });
      await router.invalidate();
    },
  });
}
