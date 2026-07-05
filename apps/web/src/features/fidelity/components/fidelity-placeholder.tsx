import type { FidelityContentViewModel } from "~/features/fidelity/types/fidelity-view-model";

interface FidelityPlaceholderProps {
  content: FidelityContentViewModel;
}

export function FidelityPlaceholder({ content }: FidelityPlaceholderProps) {
  return (
    <div className="fidelity-placeholder">
      <p className="fidelity-placeholder__eyebrow">{content.eyebrow}</p>
      <h2>{content.title}</h2>
      <p>{content.body}</p>
    </div>
  );
}
