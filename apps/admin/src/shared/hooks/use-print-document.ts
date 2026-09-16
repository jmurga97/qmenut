import { useEffect, useRef } from "react";

import { notifyError } from "~/lib/notifications";

export function usePrintDocument({
  ready,
  pageSize,
  outputClass,
  bodyClass,
}: {
  ready: boolean;
  pageSize: string;
  outputClass: string;
  bodyClass: string;
}) {
  const printableRef = useRef<HTMLDivElement>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  useEffect(() => () => cleanupRef.current?.(), []);

  function print() {
    if (!ready || !printableRef.current) return;
    cleanupRef.current?.();
    const output = printableRef.current.cloneNode(true) as HTMLDivElement;
    output.classList.add(outputClass);
    // Measurement elements belong to the preview only.
    output.querySelectorAll("[data-print-measurement]").forEach((element) => element.remove());
    (document.body as ParentNode).append(output);
    const printStyle = document.createElement("style");
    printStyle.textContent = `@page { size: ${pageSize}; margin: 0; }`;
    (document.head as ParentNode).append(printStyle);
    document.body.classList.add(bodyClass);
    const cleanup = () => {
      window.removeEventListener("afterprint", cleanup);
      document.body.classList.remove(bodyClass);
      printStyle.remove();
      output.remove();
      cleanupRef.current = null;
    };
    cleanupRef.current = cleanup;
    window.addEventListener("afterprint", cleanup, { once: true });
    try {
      window.print();
    } catch (error) {
      cleanup();
      notifyError(error);
    }
  }
  return { print, printableRef };
}
