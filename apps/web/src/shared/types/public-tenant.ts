import type { PublicImageVariant } from "@qmenut/db/models/image";
import type { QmTemplateName } from "@qmenut/ui/theme/presets";

export interface PublicTenant {
  heroPhotoUrl: string;
  heroPhotoVariants?: PublicImageVariant[];
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
