import { QmCategoryChip } from "@qmenut/ui/components/qm-category-chip/react";
import { QmCategoryNav } from "@qmenut/ui/components/qm-category-nav/react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { menuSectionElementId } from "~/features/menu/components/menu-section-id";

import type { RefObject } from "react";
import type { MenuSectionViewModel } from "~/features/menu/types/menu-view-model";

const BOTTOM_SCROLL_TOLERANCE_PX = 2;

interface MenuCategoryNavProps {
  scrollContainerRef: RefObject<HTMLElement | null>;
  sections: MenuSectionViewModel[];
}

function scrollToMenuSection(index: number): void {
  const target = document.querySelector(`#${menuSectionElementId(index)}`);
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  target?.scrollIntoView({
    behavior: reduceMotion ? "auto" : "smooth",
    block: "start",
  });
}

export function MenuCategoryNav({ scrollContainerRef, sections }: MenuCategoryNavProps) {
  const { t } = useTranslation();
  const [activeId, setActiveId] = useState(sections[0]?.id ?? "");

  useEffect(() => {
    setActiveId(sections[0]?.id ?? "");
  }, [sections]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || sections.length < 2) return;

    const targets = [...container.querySelectorAll<HTMLElement>("[data-menu-section]")];
    const navigation = container.querySelector<HTMLElement>("qm-category-nav");
    let frame = 0;

    const updateActiveCategory = () => {
      frame = 0;

      const maxScrollTop = Math.max(container.scrollHeight - container.clientHeight, 0);
      const isAtBottom =
        maxScrollTop > BOTTOM_SCROLL_TOLERANCE_PX && container.scrollTop >= maxScrollTop - BOTTOM_SCROLL_TOLERANCE_PX;
      const anchorY = navigation?.getBoundingClientRect().bottom ?? container.getBoundingClientRect().top + 68;
      const activeTarget = isAtBottom
        ? targets.at(-1)
        : (targets.findLast((target) => target.getBoundingClientRect().top <= anchorY) ?? targets[0]);
      const nextId = activeTarget?.dataset.menuSection;

      if (nextId) {
        setActiveId((currentId) => (currentId === nextId ? currentId : nextId));
      }
    };

    const scheduleActiveCategoryUpdate = () => {
      if (frame) return;
      frame = requestAnimationFrame(updateActiveCategory);
    };

    const resizeObserver = new ResizeObserver(scheduleActiveCategoryUpdate);
    resizeObserver.observe(container);
    if (navigation) {
      resizeObserver.observe(navigation);
    }
    for (const target of targets) {
      resizeObserver.observe(target);
    }

    container.addEventListener("scroll", scheduleActiveCategoryUpdate, { passive: true });
    updateActiveCategory();

    return () => {
      container.removeEventListener("scroll", scheduleActiveCategoryUpdate);
      resizeObserver.disconnect();
      if (frame) cancelAnimationFrame(frame);
    };
  }, [scrollContainerRef, sections]);

  if (sections.length < 2) return null;

  return (
    <QmCategoryNav aria-label={t("menu.categoryNavigationLabel")}>
      {sections.map((section, index) => (
        <QmCategoryChip
          key={section.id}
          value={section.id}
          active={section.id === activeId}
          onQmSelect={() => {
            scrollToMenuSection(index);
          }}
        >
          {section.label}
        </QmCategoryChip>
      ))}
    </QmCategoryNav>
  );
}
