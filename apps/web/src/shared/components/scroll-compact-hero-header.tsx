import { QmHeroHeader } from "@qmenut/ui/react";
import { useEffect, useState } from "react";

import type { ComponentProps, RefObject } from "react";

type QmHeroHeaderProps = ComponentProps<typeof QmHeroHeader>;

export interface ScrollCompactHeroHeaderProps extends Omit<QmHeroHeaderProps, "compact"> {
  scrollContainerRef: RefObject<HTMLElement | null>;
}

/**
 * Wraps `QmHeroHeader` and collapses it to the compact bar once the scroll area leaves the top,
 * re-expanding when it returns. The compact state is really just "am I at the top?" — a single
 * threshold — so it's driven by an `IntersectionObserver` watching a zero-height sentinel at the
 * top of the scroll content rather than a per-frame scroll listener. That keeps the work off the
 * scroll critical path and avoids reading `scrollTop`/`scrollHeight` while the CSS transition is in
 * flight (a forced synchronous reflow that made the collapse janky).
 */
export function ScrollCompactHeroHeader({ scrollContainerRef, ...heroHeaderProps }: ScrollCompactHeroHeaderProps) {
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    // 1px marker pinned to the top of the scroll content. `.home-scroll`'s own top padding (~16px in
    // the hero layout) means it slips out of view after a small scroll, matching the old threshold
    // feel. It needs a non-zero size — a zero-area target never triggers IntersectionObserver.
    const sentinel = document.createElement("div");
    sentinel.setAttribute("aria-hidden", "true");
    sentinel.style.height = "1px";
    container.insertAdjacentElement("afterbegin", sentinel);

    const observer = new IntersectionObserver(([entry]) => setCompact(!entry.isIntersecting), {
      root: container,
      threshold: 0,
    });
    observer.observe(sentinel);

    return () => {
      observer.disconnect();
      sentinel.remove();
    };
  }, [scrollContainerRef]);

  return <QmHeroHeader {...heroHeaderProps} compact={compact} />;
}
