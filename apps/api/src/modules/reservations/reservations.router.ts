import { z } from "zod";

import {
  answerPublicReservation,
  createPublicReservation,
  getEmailFromLink,
  getGuestReservations,
  getPublicAvailability,
} from "./public-reservations";
import { publicProcedure, router } from "../../trpc/trpc";

const MAX_RANGE_DAYS = 62;
const DAY_MS = 24 * 60 * 60 * 1000;

const hostInputSchema = z.object({ host: z.string().trim().min(1).optional() });
const dateSchema = z.iso.date();
const emailSchema = z.email().trim().toLowerCase().max(254);

const availabilityInputSchema = hostInputSchema
  .extend({ from: dateSchema, to: dateSchema })
  .refine(({ from, to }) => from <= to && Date.parse(to) - Date.parse(from) <= MAX_RANGE_DAYS * DAY_MS, {
    message: `El rango no puede pasar de ${MAX_RANGE_DAYS} días`,
  });

const createInputSchema = hostInputSchema.extend({
  date: dateSchema,
  minute: z.number().int().min(0).max(1439),
  partySize: z.number().int().min(1).max(100),
  name: z.string().trim().min(1).max(80),
  phone: z.string().regex(/^\+[1-9]\d{7,14}$/, "Usa formato internacional, p. ej. +34600000000"),
  email: emailSchema,
  consent: z.literal(true),
  language: z
    .string()
    .trim()
    .regex(/^[a-z]{2,3}(?:-[a-z0-9]{2,8})*$/),
});

const reservationIdSchema = z.string().trim().min(1).max(64);
const byEmailInputSchema = hostInputSchema.extend({ email: emailSchema });
const linkInputSchema = hostInputSchema.extend({ reservationId: reservationIdSchema });
const answerInputSchema = byEmailInputSchema.extend({ reservationId: reservationIdSchema });

export const reservationsRouter = router({
  availability: publicProcedure
    .input(availabilityInputSchema)
    .query(({ ctx, input }) => getPublicAvailability({ db: ctx.db, env: ctx.env, request: ctx.request, ...input })),
  create: publicProcedure
    .input(createInputSchema)
    .mutation(({ ctx, input: { consent: _consent, ...input } }) =>
      createPublicReservation({ db: ctx.db, env: ctx.env, request: ctx.request, ...input }),
    ),
  byEmail: publicProcedure
    .input(byEmailInputSchema)
    .query(({ ctx, input }) => getGuestReservations({ db: ctx.db, env: ctx.env, request: ctx.request, ...input })),
  // A query that changes nothing: email scanners open links, so confirming takes the guest's tap.
  emailFromLink: publicProcedure
    .input(linkInputSchema)
    .query(({ ctx, input }) => getEmailFromLink({ db: ctx.db, env: ctx.env, request: ctx.request, ...input })),
  confirm: publicProcedure
    .input(answerInputSchema)
    .mutation(({ ctx, input }) =>
      answerPublicReservation({ db: ctx.db, env: ctx.env, request: ctx.request, ...input, answer: "confirm" }),
    ),
  cancel: publicProcedure
    .input(answerInputSchema)
    .mutation(({ ctx, input }) =>
      answerPublicReservation({ db: ctx.db, env: ctx.env, request: ctx.request, ...input, answer: "cancel" }),
    ),
});
