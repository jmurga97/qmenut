import type { ReactNode } from "react";

export function PageHeader({
  actions,
  description,
  headingLevel = 1,
  kicker,
  title,
}: {
  actions?: ReactNode;
  description?: ReactNode;
  /** 2 when the header sits inside a page that already owns the h1, e.g. a list | editor pane. */
  headingLevel?: 1 | 2;
  kicker: ReactNode;
  title: ReactNode;
}) {
  const Heading = headingLevel === 2 ? "h2" : "h1";
  return (
    <header className={"admin-page-header ming-page-header"}>
      <div className={"ming-page-header__title"}>
        <div className={"ming-eyebrow"}>{kicker}</div>
        <Heading>{title}</Heading>
        {description ? <p>{description}</p> : null}
      </div>
      {actions ? <div className={"ming-page-header__actions"}>{actions}</div> : null}
    </header>
  );
}
