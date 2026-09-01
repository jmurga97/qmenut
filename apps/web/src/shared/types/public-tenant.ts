import type { QmTemplateName } from "@qmenut/ui/theme/presets";

export interface PublicTenant {
  heroPhotoUrl: string;
  primary: string;
  showDishPhoto: boolean;
  showMenuPhotos: boolean;
  publicFeatures: {
    loyalty: boolean;
  };
  secondary: string;
  template: QmTemplateName;
  tenantName: string;
  tenantTagline: string;
  sourceCurrency: string;
  vesExchangeRate: string | null;
  vesPricesEnabled: boolean;
}
