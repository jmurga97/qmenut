export type LoyaltyRewardType = "free_dish" | "percentage_discount" | "special_price";
export type RedemptionStatus = "expired" | "pending" | "rejected" | "validated";
export type LoyaltyTransactionType = "adjust" | "earn" | "expire" | "redeem";

export interface LoyaltyProgramState {
  isActive: boolean;
  stampsPerVisit: number;
  ticketMedio: number | null;
  type: "points" | "stamps";
}

export interface LoyaltyRewardView {
  cost: number;
  description: string | null;
  freeDishId: string | null;
  freeDishName: string | null;
  id: string;
  isActive: boolean;
  name: string;
  percentage: number | null;
  specialPrice: number | null;
  type: LoyaltyRewardType;
}

export interface CustomerCardState {
  customerId: string;
  email: string;
  firstVisitAt: number | null;
  lastVisitAt: number | null;
  stampsBalance: number;
}

export interface RedemptionDetail {
  cost: number;
  createdAt: number;
  customerId: string;
  id: string;
  rewardId: string;
  rewardName: string;
  status: RedemptionStatus;
  validatedAt: number | null;
}

export interface PendingRedemptionRow extends RedemptionDetail {
  email: string;
}

export interface LoyaltyTransactionResult {
  newBalance: number;
  transactionId: number;
}
