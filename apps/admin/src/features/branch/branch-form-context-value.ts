import { createContext, useContext } from "react";

import { i18n } from "~/lib/i18n";

import type { useBranchController } from "./hooks/use-branch-controller";

type BranchController = ReturnType<typeof useBranchController>;

export interface BranchFormContextValue {
  branchId: string;
  controller: BranchController;
}

export const BranchFormContext = createContext<BranchFormContextValue | null>(null);

export function useBranchForm(): BranchFormContextValue {
  const value = useContext(BranchFormContext);
  if (!value) throw new Error(i18n.t("branch___useBranchForm debe usarse dentro de BranchFormProvider"));
  return value;
}
