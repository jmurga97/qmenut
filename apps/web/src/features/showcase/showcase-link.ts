import { map, observable } from "@trpc/server/observable";

import type { QueryClient } from "@tanstack/react-query";
import type { RouterOutputs, TrpcLink } from "~/lib/trpc-client";

/**
 * Landing showcase: once the trusted landing parent says hello, loyalty and reservations are answered
 * in this page and never reach the API. Everything else still goes to the API, so the menu stays real.
 */
let active = false;

/** How long the pretend staff takes to accept a stamp or validate a reward. */
const STAFF_DELAY_MS = 3000;
const REDEMPTION_TTL_MS = 15 * 60 * 1000;
const DAY_MS = 86_400_000;
// Lunch and dinner every half hour, closed on Mondays, some times already taken.
const DEMO_MINUTES = [780, 810, 840, 870, 1230, 1260, 1290, 1320];

type PublicMenuData = NonNullable<RouterOutputs["menu"]["publicData"]>;
type LoyaltyProgram = NonNullable<RouterOutputs["loyalty"]["program"]>;
type LoyaltyCard = RouterOutputs["loyalty"]["getCard"];
type Reward = LoyaltyProgram["rewards"][number];
type Reservation = RouterOutputs["reservations"]["byEmail"][number] & { email: string };
type Redemption = NonNullable<LoyaltyCard["pendingRedemption"]> & { status: "cancelled" | "pending" | "validated" };

interface DemoCard {
  balance: number;
  email: string;
  lastOutcome: LoyaltyCard["lastOutcome"];
  pendingRequests: LoyaltyCard["pendingRequests"];
  redemption: Redemption | null;
}

// The product hooks build these inputs, so every call carries the fields its procedure needs.
interface DemoInput {
  cardToken: string;
  date: string;
  email: string;
  from: string;
  minute: number;
  partySize: number;
  quantity: number;
  redemptionId: string;
  requestId: string;
  reservationId: string;
  rewardId: string;
}

interface HandlerContext {
  input: DemoInput;
  queryClient: QueryClient;
}

const DEMO_PROGRAM: LoyaltyProgram = {
  program: { stampRequestLimit: 2 },
  rewards: [
    {
      cost: 8,
      description: null,
      freeDishId: null,
      freeDishName: null,
      id: "demo-reward",
      isActive: true,
      name: "10 % en tu próxima visita",
      percentage: 10,
      specialPrice: null,
      type: "percentage_discount",
    },
  ],
};

// Survive tab switches; a reload starts again.
const cards = new Map<string, DemoCard>();
const reservations: Reservation[] = [];

export function activateShowcase(): void {
  active = true;
}

/** Every public tab shows in the showcase, whatever the demo tenant has turned on. */
export function withAllFeatures(data: PublicMenuData | null | undefined): PublicMenuData | null | undefined {
  return (
    data && { ...data, publicFeatures: { ...data.publicFeatures, highlights: true, loyalty: true, reservations: true } }
  );
}

/** A restaurant without rewards still gets a program to play with. */
function withDemoProgram(program: LoyaltyProgram | null | undefined): LoyaltyProgram {
  return program?.rewards.length ? program : DEMO_PROGRAM;
}

function getRewards(queryClient: QueryClient): Reward[] {
  const [entry] = queryClient.getQueriesData<LoyaltyProgram>({ queryKey: [["loyalty", "program"]] });
  return withDemoProgram(entry?.[1]).rewards;
}

function getCard(token: string, rewards: Reward[]): DemoCard {
  const existing = cards.get(token);
  if (existing) return existing;
  // One stamp short of the first reward, so the visitor gets to redeem it too.
  const card: DemoCard = {
    balance: Math.max(0, (rewards[0]?.cost ?? 1) - 1),
    email: token.slice("demo:".length),
    lastOutcome: null,
    pendingRequests: [],
    redemption: null,
  };
  cards.set(token, card);
  return card;
}

function viewCard(card: DemoCard, rewards: Reward[]): LoyaltyCard {
  const pending = card.redemption?.status === "pending" ? card.redemption : null;

  return {
    card: { customerId: "demo", email: card.email, firstVisitAt: null, lastVisitAt: null, stampsBalance: card.balance },
    consentRequired: false,
    lastOutcome: card.lastOutcome,
    pendingRedemption: pending && {
      cost: pending.cost,
      expiresAt: pending.expiresAt,
      id: pending.id,
      rewardId: pending.rewardId,
      rewardName: pending.rewardName,
    },
    pendingRequests: card.pendingRequests,
    pendingStamps: card.pendingRequests.reduce((sum, request) => sum + request.quantity, 0),
    programActive: true,
    rewards: rewards.map((reward) => ({ ...reward, unlocked: card.balance >= reward.cost })),
  };
}

function cardFor({ input, queryClient }: HandlerContext): DemoCard {
  return getCard(input.cardToken, getRewards(queryClient));
}

function afterStaff(queryClient: QueryClient, action: () => void): void {
  window.setTimeout(() => {
    action();
    void queryClient.invalidateQueries({ queryKey: [["loyalty"]] });
  }, STAFF_DELAY_MS);
}

function getAvailability(from: string) {
  const month = from.slice(0, 7);
  const today = new Date().toLocaleDateString("sv");
  const lastDate = new Date(Date.parse(today) + 45 * DAY_MS).toISOString().slice(0, 10);
  const [year, monthIndex] = month.split("-").map(Number);
  const length = new Date(Date.UTC(year, monthIndex, 0)).getUTCDate();
  const days = Array.from({ length }, (_, index) => {
    const date = `${month}-${String(index + 1).padStart(2, "0")}`;
    const closed = new Date(`${date}T00:00:00Z`).getUTCDay() === 1;
    const slots = DEMO_MINUTES.map((minute, slot) => ({ minute, startsAt: 0, freeTables: (index + slot) % 4 ? 3 : 0 }));
    return closed ? { date, state: "unavailable" as const, slots: [] } : { date, state: "available" as const, slots };
  }).filter(({ date }) => date >= today && date <= lastDate);

  return { timeZone: "UTC", onlinePartyLimit: 8, phone: null, today, lastDate, days };
}

// The demo calendar closes on Mondays, so a sample landing on one moves to Tuesday.
function inDays(days: number): string {
  const date = new Date(Date.now() + days * DAY_MS);
  if (date.getDay() === 1) date.setDate(date.getDate() + 1);
  return date.toLocaleDateString("sv");
}

function addReservation(reservation: Omit<Reservation, "cancelledBy" | "id" | "startsAt">): void {
  reservations.push({ ...reservation, cancelledBy: null, id: crypto.randomUUID(), startsAt: 0 });
  reservations.sort((a, b) => a.slotDate.localeCompare(b.slotDate) || a.slotMinute - b.slotMinute);
}

function guestReservations(email: string): Reservation[] {
  // A visitor who never booked still sees what their reservations would look like.
  if (!reservations.some((item) => item.email === email)) {
    addReservation({ email, slotDate: inDays(3), slotMinute: 1290, partySize: 2, status: "pending" });
    addReservation({ email, slotDate: inDays(9), slotMinute: 840, partySize: 4, status: "confirmed" });
  }
  return reservations.filter((item) => item.email === email);
}

function answerReservation(id: string, status: "cancelled" | "confirmed") {
  const reservation = reservations.find((item) => item.id === id);
  if (reservation) Object.assign(reservation, { status, cancelledBy: status === "cancelled" ? "guest" : null });
  return { ok: true };
}

const HANDLERS: Record<string, (context: HandlerContext) => unknown> = {
  "loyalty.acceptConsent": () => ({ ok: true }),
  "loyalty.createCard": ({ input }) => ({ cardToken: `demo:${input.email}` }),
  "loyalty.getCard": (context) => viewCard(cardFor(context), getRewards(context.queryClient)),
  "loyalty.requestStamps": (context) => {
    const card = cardFor(context);
    const requestId = crypto.randomUUID();
    card.pendingRequests.push({ createdAt: Date.now(), id: requestId, quantity: context.input.quantity });
    afterStaff(context.queryClient, () => {
      const request = card.pendingRequests.find((item) => item.id === requestId);
      if (!request) return;
      card.pendingRequests = card.pendingRequests.filter((item) => item !== request);
      card.balance += request.quantity;
      card.lastOutcome = { accepted: request.quantity, claimed: request.quantity, id: requestId, status: "accepted" };
    });
    return { requestId };
  },
  "loyalty.cancelStampRequest": (context) => {
    const card = cardFor(context);
    card.pendingRequests = card.pendingRequests.filter((item) => item.id !== context.input.requestId);
    return { ok: true };
  },
  "loyalty.dismissStampOutcome": (context) => {
    cardFor(context).lastOutcome = null;
    return { ok: true };
  },
  "loyalty.requestRedemption": (context) => {
    const card = cardFor(context);
    const reward = getRewards(context.queryClient).find((item) => item.id === context.input.rewardId);
    if (!reward) return null;
    const redemption: Redemption = {
      cost: reward.cost,
      expiresAt: Date.now() + REDEMPTION_TTL_MS,
      id: crypto.randomUUID(),
      rewardId: reward.id,
      rewardName: reward.name,
      status: "pending",
    };
    card.redemption = redemption;
    afterStaff(context.queryClient, () => {
      if (card.redemption !== redemption || redemption.status !== "pending") return;
      card.balance -= redemption.cost;
      redemption.status = "validated";
    });
    return { expiresAt: redemption.expiresAt, redemptionId: redemption.id };
  },
  "loyalty.cancelRedemption": (context) => {
    const { redemption } = cardFor(context);
    if (redemption) redemption.status = "cancelled";
    return { ok: true };
  },
  "loyalty.redemptionStatus": (context) => {
    const { redemption } = cardFor(context);
    return {
      status: redemption?.id === context.input.redemptionId ? redemption.status : "expired",
      validatedAt: null,
    };
  },
  "reservations.availability": ({ input }) => getAvailability(input.from),
  "reservations.byEmail": ({ input }) => guestReservations(input.email),
  "reservations.create": ({ input }) => {
    // New bookings wait for the guest's confirmation, as they do in production.
    guestReservations(input.email);
    addReservation({
      email: input.email,
      slotDate: input.date,
      slotMinute: input.minute,
      partySize: input.partySize,
      status: "pending",
    });
    return { ok: true };
  },
  "reservations.confirm": ({ input }) => answerReservation(input.reservationId, "confirmed"),
  "reservations.cancel": ({ input }) => answerReservation(input.reservationId, "cancelled"),
};

const RESULT_MAPS: Record<string, (data: never) => unknown> = {
  "menu.publicData": withAllFeatures,
  "loyalty.program": withDemoProgram,
};

export function createShowcaseLink(queryClient: QueryClient): TrpcLink {
  return () =>
    ({ op, next }) => {
      if (!active) return next(op);

      const handler = HANDLERS[op.path];
      if (handler) {
        const data = handler({ input: op.input as DemoInput, queryClient });
        return observable((observer) => {
          observer.next({ result: { type: "data", data } });
          observer.complete();
        });
      }

      const mapData = RESULT_MAPS[op.path];
      if (!mapData) return next(op);
      return next(op).pipe(
        map((envelope) =>
          "data" in envelope.result
            ? { ...envelope, result: { ...envelope.result, data: mapData(envelope.result.data as never) } }
            : envelope,
        ),
      );
    };
}
