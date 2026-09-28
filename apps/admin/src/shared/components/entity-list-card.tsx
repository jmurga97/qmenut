import type { ReactNode } from "react";

export function EntityListCard({
  action,
  children,
  count,
  emptyText,
  title,
}: {
  action: ReactNode;
  children: ReactNode;
  count: number;
  emptyText: string;
  title: string;
}) {
  return (
    <section className="admin-card" aria-label={title}>
      <div className="admin-toolbar">
        <div className={"ming-cluster"}>
          <h2 className={"ming-section__title"}>{title}</h2>
          <span className={"ming-eyebrow"}>{count}</span>
        </div>
        {action}
      </div>
      {count === 0 ? <p className="admin-copy">{emptyText}</p> : <ul className="admin-list">{children}</ul>}
    </section>
  );
}
