import type { RedemptionQueueState } from "~/features/loyalty/hooks/use-redemption-queue";

export function RedemptionToast({ queue }: { queue: RedemptionQueueState }) {
  if (!queue.undoNotice) return null;
  return (
    <aside aria-live="polite" className="loyalty-toast">
      <p>
        <strong>Canje validado.</strong> {queue.undoNotice.error ?? queue.undoNotice.message}
      </p>
      <button disabled={queue.undoBusy} onClick={queue.undo} type="button">
        {queue.undoBusy ? "Deshaciendo…" : "Deshacer"}
      </button>
    </aside>
  );
}
