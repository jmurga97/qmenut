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
      setSelectedBranchId: (selectedBranchId) => set({ selectedBranchId }),
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
export function resolveSelectedBranch<TBranch extends BranchLike>(
  branches: TBranch[],
  selectedBranchId: string | null,
): TBranch | null {
  return branches.find((branch) => branch.id === selectedBranchId) ?? branches[0] ?? null;
}
