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
  id: string;
  name: string;
  phone: string | null;
  photos: PublicBranchPhoto[];
  schedules: PublicBranchSchedule[];
  socialLinks: unknown;
  whatsapp: string | null;
}
