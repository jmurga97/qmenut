import { referralParticipants, referrals } from "@qmenut/db/schema";
import { count, desc, like, or, sql } from "drizzle-orm";

import type { TrpcContext } from "../../trpc/context";

/** Only verified sign-ups become participants; imported and unverified contacts never appear here. */
export async function listParticipants({
  db,
  search,
  page,
}: Pick<TrpcContext, "db"> & { search: string; page: number }) {
  const pattern = `%${search.toLowerCase()}%`;
  const where = search
    ? or(like(referralParticipants.email, pattern), like(sql`lower(${referralParticipants.name})`, pattern))
    : undefined;
  const pageSize = 20;
  const [rows, total] = await Promise.all([
    db
      .select({
        id: referralParticipants.id,
        name: referralParticipants.name,
        email: referralParticipants.email,
        phone: referralParticipants.phone,
        rewardCents: referralParticipants.rewardCents,
        joinedAt: referralParticipants.createdAt,
        referrals: sql<number>`(SELECT count(*) FROM ${referrals} WHERE ${referrals.participantId} = ${referralParticipants.id})`,
      })
      .from(referralParticipants)
      .where(where)
      .orderBy(desc(referralParticipants.createdAt), desc(referralParticipants.id))
      .limit(pageSize)
      .offset(page * pageSize)
      .all(),
    db.select({ total: count() }).from(referralParticipants).where(where).get(),
  ]);

  return { rows, total: total?.total ?? 0, pageSize };
}
