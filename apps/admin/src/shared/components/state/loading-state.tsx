import { i18n } from "~/lib/i18n";

import type { ReactNode } from "react";

const ROW_WIDTHS = ["62%", "48%", "70%", "54%", "66%"];

/** Pulsing placeholder sized like the text or block it stands in for. */
export function Skeleton({ height, width }: Readonly<{ height?: string; width?: string }>) {
  return <span aria-hidden={"true"} className="admin-skeleton" style={{ blockSize: height, inlineSize: width }} />;
}

/** List-card fallback: the title is static, so it renders for real; only the rows are placeholders. */
export function CardSkeleton({ rows = 3, title }: Readonly<{ rows?: number; title?: ReactNode }>) {
  return (
    <section
      aria-busy={"true"}
      aria-label={
        typeof title === "string" ? i18n.t("shared___Cargando {{title}}", { title }) : i18n.t("shared___Cargando")
      }
      className="admin-card"
    >
      <div className="admin-toolbar">
        {title ? <h2 className={"ming-section__title"}>{title}</h2> : <Skeleton height={"1.25rem"} width={"12rem"} />}
      </div>
      <ul aria-hidden={"true"} className="admin-list">
        {Array.from({ length: rows }, (_, index) => (
          <li className="admin-list-item" key={index}>
            <Skeleton width={ROW_WIDTHS[index % ROW_WIDTHS.length]} />
            <Skeleton width={"4.5rem"} />
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Route-level fallback for views whose header also depends on data. */
export function LoadingState() {
  return (
    <div aria-busy={"true"} aria-label={i18n.t("shared___Cargando")} className={"ming-page admin-page"} role={"status"}>
      <header className={"admin-page-header ming-page-header"}>
        <div className={"ming-page-header__title"}>
          <Skeleton height={"0.75rem"} width={"6rem"} />
          <Skeleton height={"1.75rem"} width={"min(16rem, 70%)"} />
        </div>
      </header>
      <CardSkeleton rows={4} />
      <CardSkeleton />
    </div>
  );
}
