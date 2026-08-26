import { lazy, Suspense, useEffect, useRef, useState } from "react";

import { usePublicRouteLayout } from "~/shared/components/public-route-layout/public-route-layout-context";

const GoogleReviewsSection = lazy(async () => {
  const module = await import("./google-reviews-section");
  return { default: module.GoogleReviewsSection };
});

export function GoogleReviewsLazy() {
  const { scrollContainerRef } = usePublicRouteLayout();
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [nearViewport, setNearViewport] = useState(false);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || nearViewport) return;
    if (!("IntersectionObserver" in window)) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        setNearViewport(true);
        observer.disconnect();
      },
      { root: scrollContainerRef.current, rootMargin: "400px 0px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [nearViewport, scrollContainerRef]);

  if (!nearViewport) {
    return <div aria-hidden="true" ref={sentinelRef} style={{ blockSize: 1 }} />;
  }

  return (
    <Suspense
      fallback={
        <div
          aria-label="Loading Google reviews"
          role="status"
          style={{
            minHeight: "17rem",
            borderRadius: "var(--qm-surface-radius, var(--qm-radius, .75rem))",
            background: "var(--qm-card, #eee)",
          }}
        />
      }
    >
      <GoogleReviewsSection />
    </Suspense>
  );
}
