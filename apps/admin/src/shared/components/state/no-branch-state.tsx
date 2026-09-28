import { i18n } from "~/lib/i18n";

import { EmptyState } from "./empty-state";

export function NoBranchState({ description }: { description: string }) {
  return (
    <div className={"ming-page admin-page"}>
      <EmptyState description={description} title={i18n.t("shared___Sin sucursal")} />
    </div>
  );
}
