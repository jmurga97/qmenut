import {
  countActiveRewards,
  getLoyaltyProgram as findProgram,
  listRewards,
} from "@qmenut/db/repositories/loyalty-admin.repository";
import { getRestaurantLanguageInfo } from "@qmenut/db/repositories/restaurant-languages.repository";

import { getTranslationContent, languageTexts, publicTranslationMap } from "../admin-translations/translation-content";
import { resolvePublicTenant } from "../public-menu/resolve-public-tenant";

import type { DrizzleDb } from "@qmenut/db/client";
import type { LoyaltyRewardView } from "@qmenut/db/models/loyalty";

interface GetLoyaltyProgramForClientInput {
  db: DrizzleDb;
  request: Request;
  host?: string;
  locale?: string;
}

export interface PublicLoyaltyProgram {
  program: { stampsPerVisit: number };
  rewards: LoyaltyRewardView[];
}

export interface PublicLoyaltyFeatures {
  loyalty: boolean;
}

interface PublicLoyaltyFeaturesInput {
  db: DrizzleDb;
  restaurantId: string;
}

export async function getPublicLoyaltyFeatures({
  db,
  restaurantId,
}: PublicLoyaltyFeaturesInput): Promise<PublicLoyaltyFeatures> {
  const [program, activeRewardCount] = await Promise.all([
    findProgram({ db, restaurantId }),
    countActiveRewards({ db, restaurantId }),
  ]);

  return { loyalty: program?.isActive === true && activeRewardCount > 0 };
}

export async function getLoyaltyProgramForClient({
  db,
  request,
  host,
  locale,
}: GetLoyaltyProgramForClientInput): Promise<PublicLoyaltyProgram | null> {
  const tenant = await resolvePublicTenant({ db, request, host });

  if (!tenant) {
    return null;
  }

  const program = await findProgram({ db, restaurantId: tenant.restaurantId });

  if (!program?.isActive) {
    return null;
  }

  const rewards = await listRewards({ db, restaurantId: tenant.restaurantId, includeInactive: false });
  const info = await getRestaurantLanguageInfo({ db, restaurantId: tenant.restaurantId });
  if (
    !locale ||
    locale === info?.defaultLanguageCode ||
    !info?.languages.some((language) => language.languageCode === locale)
  ) {
    return { program: { stampsPerVisit: program.stampsPerVisit }, rewards };
  }
  const items = languageTexts(await getTranslationContent({ db, restaurantId: tenant.restaurantId }), locale);
  if (!items.every((item) => item.complete)) return { program: { stampsPerVisit: program.stampsPerVisit }, rewards };
  const texts = publicTranslationMap(items);
  return {
    program: { stampsPerVisit: program.stampsPerVisit },
    rewards: rewards.map((reward) => ({
      ...reward,
      name: texts.get(reward.id)?.get("name") ?? reward.name,
      description: texts.get(reward.id)?.get("description") ?? reward.description,
      freeDishName: reward.freeDishId ? (texts.get(reward.freeDishId)?.get("name") ?? reward.freeDishName) : null,
    })),
  };
}
