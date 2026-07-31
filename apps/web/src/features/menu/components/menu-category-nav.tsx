import { QmCategoryChip } from "@qmenut/ui/components/qm-category-chip/react";
import { defineQmCategoryNav } from "@qmenut/ui/components/qm-category-nav";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { menuSectionElementId } from "~/features/menu/components/menu-section-id";

import type { RefObject } from "react";
import type { MenuSectionViewModel } from "~/features/menu/types/menu-view-model";

defineQmCategoryNav();

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
    const observer = new IntersectionObserver(
      () => {
        const anchorY = container.getBoundingClientRect().top + 68;
        const isAtBottom = container.scrollTop + container.clientHeight >= container.scrollHeight - 2;
        const activeTarget = isAtBottom
          ? targets.at(-1)
          : (targets.findLast((target) => target.getBoundingClientRect().top <= anchorY) ?? targets[0]);
        const nextId = activeTarget?.dataset.menuSection;

        if (nextId) {
          setActiveId(nextId);
        }
      },
      {
        root: container,
        rootMargin: "-8% 0px -72% 0px",
        threshold: [0, 0.01],
      },
    );

    for (const target of targets) {
      observer.observe(target);
    }

    return () => observer.disconnect();
  }, [scrollContainerRef, sections]);

  if (sections.length < 2) return null;

  return (
    <qm-category-nav aria-label={t("menu.categoryNavigationLabel")}>
      {sections.map((section, index) => (
        <QmCategoryChip
          key={section.id}
          value={section.id}
          active={section.id === activeId}
          onQmSelect={() => {
            setActiveId(section.id);
            scrollToMenuSection(index);
          }}
        >
          {section.label}
        </QmCategoryChip>
      ))}
    </qm-category-nav>
  );
}
