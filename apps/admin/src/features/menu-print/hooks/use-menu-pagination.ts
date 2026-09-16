import { useEffect, useState } from "react";

import { paginateMenu } from "../paginate";

import type { PrintCategory } from "../content";
import type { Pagination } from "../paginate";
import type { RefObject } from "react";

function measureMenu(element: HTMLDivElement, categories: PrintCategory[]) {
  const height = (selector: string) =>
    Math.ceil(element.querySelector<HTMLElement>(selector)?.getBoundingClientRect().height ?? 0);
  const capacities = [0, 1, 2, 3].map(
    (slot) => (element.querySelector<HTMLElement>(`[data-print-slot="${slot}"]`)?.clientHeight ?? 0) - 2,
  );
  const measured = categories.map((category, index) => ({
    header: height(`[data-measure-header="${index}"]`),
    dishes: category.dishes.map((_, dish) => height(`[data-measure-dish="${index}-${dish}"]`)),
  }));
  return { capacities, measured };
}

export function useMenuPagination({
  ref,
  categories,
  ready,
  layoutKey,
}: {
  ref: RefObject<HTMLDivElement | null>;
  categories: PrintCategory[];
  ready: boolean;
  layoutKey: string;
}) {
  const [result, setResult] = useState<{ categories: PrintCategory[]; key: string; pages: Pagination } | null>(null);
  useEffect(() => {
    if (!ready) return;
    const frame = requestAnimationFrame(() => {
      const element = ref.current;
      if (!element) return;
      const { capacities, measured } = measureMenu(element, categories);
      setResult({ categories, key: layoutKey, pages: paginateMenu({ categories: measured, capacities }) });
    });
    return () => cancelAnimationFrame(frame);
  }, [ref, categories, ready, layoutKey]);
  return ready && result?.categories === categories && result.key === layoutKey ? result.pages : null;
}
