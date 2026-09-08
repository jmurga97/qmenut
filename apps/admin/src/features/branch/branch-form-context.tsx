import { createContext, useContext } from "react";

import type { useBranchController } from "./hooks/use-branch-controller";

type BranchController = ReturnType<typeof useBranchController>;
interface BranchFormContextValue {
  branchId: string;
  controller: BranchController;
}
const BranchFormContext = createContext<BranchFormContextValue | null>(null);
export const BranchFormProvider = BranchFormContext.Provider;
export function useBranchForm(): BranchFormContextValue {
  const value = useContext(BranchFormContext);
  if (!value) throw new Error("useBranchForm debe usarse dentro de BranchFormProvider");
  return value;
}
