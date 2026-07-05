import type { QmTemplateName } from "@qmenut/ui";

export interface PublicTenant {
  heroPhotoUrl: string;
  primary: string;
  secondary: string;
  template: QmTemplateName;
  tenantName: string;
  tenantTagline: string;
}
