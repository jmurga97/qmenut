import type { ReactNode } from "react";

type EmptyStateProps = {
  title: string;
  description: string;
  children?: ReactNode;
};
export function EmptyState({ title, description, children }: EmptyStateProps) {
  return (
    <div className={"ming-empty"}>
      <h1>{title}</h1>
      <p>{description}</p>
      {children}
    </div>
  );
}
