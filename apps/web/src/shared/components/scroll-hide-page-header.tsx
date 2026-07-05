import { QmPageHeader } from "@qmenut/ui/react";
import { useEffect, useRef, useState } from "react";

import type { ComponentProps, RefObject } from "react";

/** Reuses `QmPageHeader`'s own inferred prop type instead of redeclaring every field. */
type QmPageHeaderProps = ComponentProps<typeof QmPageHeader>;

export interface ScrollHidePageHeaderProps extends QmPageHeaderProps {
  /** The scrollable element whose direction drives the hide/show behavior. */
  scrollContainerRef: RefObject<HTMLElement | null>;
}

/** Same-direction distance that must accumulate before flipping. */
const DIRECTION_THRESHOLD_PX = 16;
const REVEAL_TOP_OFFSET_PX = 40;

/**
 * Wraps `QmPageHeader` and slides it over the scroll area when the user scrolls down,
 * revealing it again on scroll up. Scroll direction is read off `scrollContainerRef` rather
 * than `window`, since the app's menu content scrolls inside its own `.home-scroll` container.
 */
export function ScrollHidePageHeader({ scrollContainerRef, ...pageHeaderProps }: ScrollHidePageHeaderProps) {
  const [hidden, setHidden] = useState(false);
  const headerRef = useRef<HTMLDivElement>(null);
  const hiddenRef = useRef(hidden);

  useEffect(() => {
    hiddenRef.current = hidden;
  }, [hidden]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    const header = headerRef.current;
    if (!container || !header) return;

    const updateHeaderHeight = () => {
      container.style.setProperty("--scroll-hide-header-height", `${header.offsetHeight}px`);
    };

    updateHeaderHeight();

    const resizeObserver = new ResizeObserver(updateHeaderHeight);
    resizeObserver.observe(header);

    return () => {
      resizeObserver.disconnect();
      container.style.removeProperty("--scroll-hide-header-height");
    };
  }, [scrollContainerRef]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    let lastScrollTop = container.scrollTop;
    let accumulated = 0;
    let frame = 0;

    const setHiddenIfChanged = (nextHidden: boolean) => {
      if (hiddenRef.current === nextHidden) return;

      hiddenRef.current = nextHidden;
      setHidden(nextHidden);
    };

    const readScroll = () => {
      frame = 0;
      const maxScrollTop = container.scrollHeight - container.clientHeight;
      const scrollTop = Math.min(Math.max(container.scrollTop, 0), maxScrollTop);
      const diff = scrollTop - lastScrollTop;
      lastScrollTop = scrollTop;

      if (diff === 0) return;

      if (scrollTop <= REVEAL_TOP_OFFSET_PX) {
        accumulated = 0;
        setHiddenIfChanged(false);
        return;
      }

      accumulated += diff;

      if (Math.abs(accumulated) < DIRECTION_THRESHOLD_PX) return;

      setHiddenIfChanged(accumulated > 0);
      accumulated = 0;
    };

    const handleScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(readScroll);
    };

    container.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      container.removeEventListener("scroll", handleScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [scrollContainerRef]);

  return (
    <div ref={headerRef} aria-hidden={hidden} className="scroll-hide-header" data-hidden={hidden} inert={hidden}>
      <div className="scroll-hide-header__inner">
        <QmPageHeader {...pageHeaderProps} />
      </div>
    </div>
  );
}
