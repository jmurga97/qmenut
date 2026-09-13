import { useEffect } from "react";

import { setEditorDirty, setEditorPending } from "~/shared/stores/shell-store";

const editors = new Map<symbol, { dirty: boolean; pending: boolean }>();
function publish() {
  setEditorDirty([...editors.values()].some((editor) => editor.dirty));
  setEditorPending([...editors.values()].some((editor) => editor.pending));
}
export function useEditorGuard({ dirty, pending }: { dirty: boolean; pending: boolean }) {
  useEffect(() => {
    const id = Symbol();
    editors.set(id, { dirty, pending });
    publish();
    return () => {
      editors.delete(id);
      publish();
    };
  }, [dirty, pending]);
}
