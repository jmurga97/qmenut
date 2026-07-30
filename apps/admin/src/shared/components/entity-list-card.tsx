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
    <section className="admin-card">
      <div className="admin-toolbar">
        <div className="admin-kicker">{`${title} (${count})`}</div>
        {action}
      </div>
      {count === 0 ? <p className="admin-copy">{emptyText}</p> : <ul className="admin-list">{children}</ul>}
    </section>
  );
}
