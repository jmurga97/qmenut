import type { ReactNode } from "react";

export function PageHeader({
  description,
  kicker,
  title,
}: {
  description?: ReactNode;
  kicker: ReactNode;
  title: ReactNode;
}) {
  return (
    <header className="admin-page-header">
      <div className="admin-kicker">{kicker}</div>
      <h2>{title}</h2>
      {description ? <p>{description}</p> : null}
    </header>
  );
}
