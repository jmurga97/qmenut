import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

interface BranchStore {
  selectedBranchId: string | null;
  setSelectedBranchId: (branchId: string) => void;
}

const BRANCH_STORAGE_KEY = "qmenut-admin-branch";

export const useBranchStore = create<BranchStore>()(
  persist(
    (set) => ({
      selectedBranchId: null,
      setSelectedBranchId: (branchId) => {
        set({ selectedBranchId: branchId });
      },
    }),
    {
      name: BRANCH_STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

interface BranchLike {
  id: string;
}

/**
 * Sucursal activa: la persistida si sigue existiendo en el tenant,
 * si no la primera disponible.
 */
export function resolveSelectedBranch<TBranch extends BranchLike>(
  branches: TBranch[],
  selectedBranchId: string | null,
): TBranch | null {
  if (branches.length === 0) {
    return null;
  }

  return branches.find((branch) => branch.id === selectedBranchId) ?? branches[0];
}
