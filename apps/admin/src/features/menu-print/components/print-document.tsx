import { useEffect, useRef, useState } from "react";

import { PrintCategoryHeading, PrintDishRow } from "./print-content";

import type { PrintCategory, PrintFormat } from "../content";
import type { PrintSegment } from "../paginate";
import type { CSSProperties } from "react";

interface DocumentProps {
  categories: PrintCategory[];
  format: PrintFormat;
  slots: PrintSegment[][];
  name: string;
  tagline: string;
  logoUrl: string | null;
  qrSvg: string | null;
}

function PrintBrand({ name, tagline, logoUrl }: Pick<DocumentProps, "name" | "tagline" | "logoUrl">) {
  return (
    <header className="menu-print-brand">
      {logoUrl ? <img src={logoUrl} alt="" /> : null}
      <div>
        <h2>{name}</h2>
        {tagline ? <p>{tagline}</p> : null}
      </div>
    </header>
  );
}

function PrintSlot({ index, document }: { index: number; document: DocumentProps }) {
  return (
    <section className={`menu-print-slot${index === 3 ? " menu-print-slot--qr" : ""}`}>
      {document.format === "folded" ? <PrintBrand {...document} /> : null}
      <div className="menu-print-slot__content" data-print-slot={index}>
        {document.slots[index]?.map((segment) => {
          const category = document.categories[segment.category];
          if (!category) return null;
          return (
            <div key={category.id}>
              <PrintCategoryHeading category={category} />
              {segment.dishes.map((dish) => (
                <PrintDishRow dish={category.dishes[dish]} key={category.dishes[dish].id} />
              ))}
            </div>
          );
        })}
      </div>
      {index === 3 ? (
        <div className="menu-print-qr">
          {document.qrSvg ? <div dangerouslySetInnerHTML={{ __html: document.qrSvg }} /> : null}
          <span>Ver carta online</span>
        </div>
      ) : null}
    </section>
  );
}

export function PrintDocument(props: DocumentProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      const sheet = element.querySelector<HTMLElement>(".menu-print-sheet");
      if (sheet) setScale(Math.min(1, entry.contentRect.width / sheet.offsetWidth));
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [props.format]);
  const sides =
    props.format === "folded"
      ? [
          [3, 0],
          [1, 2],
        ]
      : [
          [0, 1],
          [2, 3],
        ];
  return (
    <div ref={ref} className="menu-print-preview" style={{ "--print-preview-scale": scale } as CSSProperties}>
      {sides.map((side, index) => (
        <div className="menu-print-side" key={index}>
          <p className="menu-print-side__label">
            {props.format === "folded"
              ? ["Exterior · contraportada y portada", "Interior · carta abierta"][index]
              : ["Anverso", "Reverso"][index]}
          </p>
          <div className="menu-print-sheet-frame">
            <div className="menu-print-sheet">
              {props.format === "a4" ? <PrintBrand {...props} /> : null}
              <div className="menu-print-sheet__panels">
                {side.map((slot) => (
                  <PrintSlot document={props} index={slot} key={slot} />
                ))}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function PrintMeasurements({ categories }: { categories: PrintCategory[] }) {
  return (
    <div aria-hidden="true" className="menu-print-measurements" data-print-measurement="true">
      {categories.map((category, index) => (
        <div key={category.id}>
          <div data-measure-header={index}>
            <PrintCategoryHeading category={category} />
          </div>
          {category.dishes.map((dish, dishIndex) => (
            <div data-measure-dish={`${index}-${dishIndex}`} key={dish.id}>
              <PrintDishRow dish={dish} />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
