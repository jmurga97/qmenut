import type { QmTemplateName } from "@qmenut/ui";

interface DevTemplateSwitcherProps {
  currentTemplate: QmTemplateName;
  onSelectTemplate: (template: QmTemplateName) => void;
}

export function DevTemplateSwitcher({ currentTemplate, onSelectTemplate }: DevTemplateSwitcherProps) {
  void currentTemplate;
  void onSelectTemplate;

  return null;
}
