type EmptyStateProps = {
  title: string;
  description: string;
};
export function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <div className={"ming-empty"}>
      <h1>{title}</h1>
      <p>{description}</p>
    </div>
  );
}
