import { listAnnouncements, publishAnnouncement } from "@qmenut/db/repositories/notifications.repository";
import { z } from "zod";

import { getDailySchedule, setDailySchedulePaused, startDailySchedule } from "./campaign-schedule";
import {
  createBatch,
  createCampaign,
  deleteDraftBatch,
  getBatch,
  getCampaign,
  launchBatch,
  listCampaigns,
  pauseBatch,
  previewBatch,
  resumeBatch,
  sendBatchTest,
} from "./lab-campaigns";
import { ENGAGEMENTS, findExistingLeads, importLeads, listLeads, unsubscribeLead } from "./lab-leads";
import { getOverview } from "./lab-overview";
import { listParticipants } from "./lab-participants";
import {
  approveReferral,
  getReferral,
  listPayouts,
  listReferrals,
  markInProgress,
  markPaid,
  rejectReferral,
  saveNotes,
  searchRestaurants,
} from "./lab-review";
import { labProcedure, router } from "../../trpc/trpc";
import { MAX_CAMPAIGN_RECIPIENTS, QUALIFYING_PAYMENT_CENTS } from "../referrals/referral-domain";

const idSchema = z.string().trim().min(1).max(64);
const searchSchema = z.string().trim().max(100);
const leadSchema = z.object({
  email: z.email().trim().toLowerCase().max(254),
  name: z.string().trim().max(120).nullable(),
});
const batchInput = z.object({ batchId: idSchema });
const schedulePauseInput = z.object({ paused: z.boolean() });
const participantsListInput = z.object({ search: searchSchema, page: z.number().int().min(0) });
const campaignCreateInput = z.object({ name: z.string().trim().min(2).max(80) });
const referralInput = z.object({ referralId: idSchema });

const leadsListInput = z.object({
  search: searchSchema,
  batchId: idSchema.nullable(),
  engagement: z.enum(ENGAGEMENTS).nullable(),
  status: z.enum(["active", "unsubscribed", "bounced"]).nullable(),
  page: z.number().int().min(0),
});
const existingInput = z.object({ emails: z.array(z.string().max(254)).max(2000) });
const importInput = z.object({
  label: z.string().trim().min(1).max(80),
  leads: z.array(leadSchema).min(1).max(1000),
});
const batchCreateInput = z.object({
  campaignId: idSchema,
  size: z.number().int().min(1).max(MAX_CAMPAIGN_RECIPIENTS),
  rewardCents: z.number().int().min(100).max(100_000),
});
const referralsListInput = z.object({
  status: z.enum(["received", "in_progress", "approved", "rejected"]).nullable(),
  search: searchSchema,
});
const rejectInput = referralInput.extend({ reason: z.string().trim().min(3).max(300) });
const approveInput = referralInput.extend({
  restaurantId: idSchema,
  paymentCents: z.number().int().min(QUALIFYING_PAYMENT_CENTS, "Solo califica QMenut Business anual ($468)."),
  paymentDate: z.iso.date(),
  paymentReference: z.string().trim().min(3).max(120),
});
const notesInput = referralInput.extend({ notes: z.string().trim().max(2000) });
const markPaidInput = referralInput.extend({
  vesCents: z.number().int().positive(),
  rate: z
    .string()
    .trim()
    .regex(/^\d{1,6}(?:\.\d{1,6})?$/, "Usa un número, p. ej. 36.52"),
  reference: z.string().trim().min(3).max(120),
});

const leadsRouter = router({
  list: labProcedure.input(leadsListInput).query(({ ctx, input }) => listLeads({ db: ctx.db, ...input })),
  existing: labProcedure
    .input(existingInput)
    .mutation(({ ctx, input }) => findExistingLeads({ db: ctx.db, emails: input.emails })),
  import: labProcedure.input(importInput).mutation(({ ctx, input }) => importLeads({ ...ctx, ...input })),
  unsubscribe: labProcedure
    .input(z.object({ leadId: idSchema }))
    .mutation(({ ctx, input }) => unsubscribeLead({ ...ctx, ...input })),
});

const campaignsRouter = router({
  list: labProcedure.query(({ ctx }) => listCampaigns(ctx)),
  get: labProcedure
    .input(z.object({ campaignId: idSchema }))
    .query(({ ctx, input }) => getCampaign({ db: ctx.db, ...input })),
  create: labProcedure.input(campaignCreateInput).mutation(({ ctx, input }) => createCampaign({ ...ctx, ...input })),
});

const batchesRouter = router({
  create: labProcedure.input(batchCreateInput).mutation(({ ctx, input }) => createBatch({ ...ctx, ...input })),
  get: labProcedure.input(batchInput).query(({ ctx, input }) => getBatch({ db: ctx.db, ...input })),
  preview: labProcedure.input(batchInput).query(({ ctx, input }) => previewBatch({ ...ctx, ...input })),
  sendTest: labProcedure.input(batchInput).mutation(({ ctx, input }) => sendBatchTest({ ...ctx, ...input })),
  launch: labProcedure.input(batchInput).mutation(({ ctx, input }) => launchBatch({ ...ctx, ...input })),
  pause: labProcedure.input(batchInput).mutation(({ ctx, input }) => pauseBatch({ ...ctx, ...input })),
  resume: labProcedure.input(batchInput).mutation(({ ctx, input }) => resumeBatch({ ...ctx, ...input })),
  remove: labProcedure.input(batchInput).mutation(({ ctx, input }) => deleteDraftBatch({ ...ctx, ...input })),
});

const referralsRouter = router({
  list: labProcedure.input(referralsListInput).query(({ ctx, input }) => listReferrals({ db: ctx.db, ...input })),
  get: labProcedure.input(referralInput).query(({ ctx, input }) => getReferral({ db: ctx.db, ...input })),
  restaurants: labProcedure
    .input(z.object({ query: searchSchema }))
    .query(({ ctx, input }) => searchRestaurants({ db: ctx.db, ...input })),
  markInProgress: labProcedure.input(referralInput).mutation(({ ctx, input }) => markInProgress({ ...ctx, ...input })),
  reject: labProcedure.input(rejectInput).mutation(({ ctx, input }) => rejectReferral({ ...ctx, ...input })),
  approve: labProcedure.input(approveInput).mutation(({ ctx, input }) => approveReferral({ ...ctx, ...input })),
  saveNotes: labProcedure.input(notesInput).mutation(({ ctx, input }) => saveNotes({ ...ctx, ...input })),
});

const payoutsRouter = router({
  list: labProcedure.query(({ ctx }) => listPayouts(ctx)),
  markPaid: labProcedure.input(markPaidInput).mutation(({ ctx, input }) => markPaid({ ...ctx, ...input })),
});

const scheduleRouter = router({
  get: labProcedure.query(({ ctx }) => getDailySchedule(ctx)),
  start: labProcedure.mutation(({ ctx }) => startDailySchedule(ctx)),
  setPaused: labProcedure
    .input(schedulePauseInput)
    .mutation(({ ctx, input }) => setDailySchedulePaused({ ...ctx, ...input })),
});
const announcementText = z.object({ title: z.string().trim().min(2).max(80), body: z.string().trim().min(2).max(500) });

// ponytail: one text for both admin languages; add an English pair when English-speaking restaurants exist.
const announcementsRouter = router({
  list: labProcedure.query(({ ctx }) => listAnnouncements(ctx.db)),
  publish: labProcedure
    .input(announcementText)
    .mutation(({ ctx, input }) => publishAnnouncement({ db: ctx.db, audience: {}, text: { es: input, en: input } })),
});

const participantsRouter = router({
  list: labProcedure.input(participantsListInput).query(({ ctx, input }) => listParticipants({ db: ctx.db, ...input })),
});

export const labRouter = router({
  me: labProcedure.query(({ ctx }) => ({ email: ctx.staffEmail, delivery: ctx.env.REFERRAL_DELIVERY })),
  overview: labProcedure.query(({ ctx }) => getOverview(ctx)),
  schedule: scheduleRouter,
  participants: participantsRouter,
  leads: leadsRouter,
  campaigns: campaignsRouter,
  batches: batchesRouter,
  referrals: referralsRouter,
  payouts: payoutsRouter,
  announcements: announcementsRouter,
});
