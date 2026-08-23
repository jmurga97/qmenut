export interface PublicBranchPhoto {
  id: string;
  position: number;
  url: string;
}

export interface PublicBranchSchedule {
  closeMinute: number;
  dayOfWeek: number;
  id: string;
  openMinute: number;
}

export interface PublicBranch {
  address: string | null;
  currency: string;
  customDomain: string | null;
  googleReviewsEnabled: boolean;
  id: string;
  latitude: number | null;
  logoUrl: string | null;
  longitude: number | null;
  name: string;
  phone: string | null;
  photos: PublicBranchPhoto[];
  restaurantId: string;
  schedules: PublicBranchSchedule[];
  socialLinks: unknown;
  whatsapp: string | null;
}

export interface PublicContactBranch {
  address: string | null;
  customDomain: string | null;
  id: string;
  latitude: number | null;
  longitude: number | null;
  name: string;
  phone: string | null;
  schedules: PublicBranchSchedule[];
  socialLinks: unknown;
  whatsapp: string | null;
}
