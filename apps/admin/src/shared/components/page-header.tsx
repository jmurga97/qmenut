import type { ReactNode } from "react";

export function PageHeader({
  actions,
  description,
  kicker,
  title,
}: {
  actions?: ReactNode;
  description?: ReactNode;
  kicker: ReactNode;
  title: ReactNode;
}) {
  return (
    <header className={"admin-page-header ming-page-header"}>
      <div className={"ming-page-header__title"}>
        <div className={"ming-eyebrow"}>{kicker}</div>
        <h1>{title}</h1>
        {description ? <p>{description}</p> : null}
      </div>
      {actions ? <div className={"ming-page-header__actions"}>{actions}</div> : null}
    </header>
  );
}
