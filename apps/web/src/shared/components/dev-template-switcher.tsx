import type { QmTemplateName } from "@qmenut/ui/theme/presets";

interface DevTemplateSwitcherProps {
  currentTemplate: QmTemplateName;
  onSelectTemplate: (template: QmTemplateName) => void;
}

export function DevTemplateSwitcher({
  currentTemplate: _currentTemplate,
  onSelectTemplate: _onSelectTemplate,
}: DevTemplateSwitcherProps) {
  return null;
}
