import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useReducer } from "react";

import {
  getAvailabilityQueryOptions,
  getReservationMutationOptions,
} from "~/features/reservations/api/reservations-query-options";
import { isEmail, toE164 } from "~/features/reservations/reservation-format";
import { getTrpcErrorCode } from "~/lib/trpc-client";

import type { TrpcOptionsProxy } from "~/lib/trpc-client";

export type BookingStep = "slot" | "party" | "contact" | "review" | "sent";
export type BookingError = "full" | "unavailable" | "throttled" | "generic" | "consent" | null;
export type ContactField = "name" | "prefix" | "phone" | "email";

interface BookingState {
  step: BookingStep;
  month: string;
  date: string | null;
  minute: number | null;
  partySize: number | null;
  contact: Record<ContactField, string>;
  invalid: ContactField[];
  consent: boolean;
  error: BookingError;
}

type BookingAction =
  | { type: "month"; month: string }
  | { type: "date"; date: string }
  | { type: "slot"; minute: number }
  | { type: "party"; partySize: number }
  | { type: "field"; field: ContactField; value: string }
  | { type: "contactChecked"; invalid: ContactField[] }
  | { type: "consent"; consent: boolean }
  | { type: "back" }
  | { type: "failed"; error: BookingError }
  | { type: "sent" }
  | { type: "restart" };

const PREVIOUS_STEP: Record<BookingStep, BookingStep> = {
  slot: "slot",
  party: "slot",
  contact: "party",
  review: "contact",
  sent: "slot",
};

function bookingReducer(state: BookingState, action: BookingAction): BookingState {
  switch (action.type) {
    case "month":
      return { ...state, month: action.month };
    case "date":
      return { ...state, date: action.date, minute: null, error: null };
    case "slot":
      return { ...state, minute: action.minute, step: "party", error: null };
    case "party":
      return { ...state, partySize: action.partySize, step: "contact" };
    case "field":
      return {
        ...state,
        contact: { ...state.contact, [action.field]: action.value },
        invalid: state.invalid.filter((field) => field !== action.field),
      };
    case "contactChecked":
      return { ...state, invalid: action.invalid, step: action.invalid.length === 0 ? "review" : "contact" };
    case "consent":
      return { ...state, consent: action.consent, error: null };
    case "back":
      return { ...state, step: PREVIOUS_STEP[state.step], error: null };
    case "failed":
      // A slot that filled up or closed sends the guest back to pick another; the rest stay on review.
      return action.error === "full" || action.error === "unavailable"
        ? { ...state, step: "slot", minute: null, error: action.error }
        : { ...state, error: action.error };
    case "sent":
      return { ...state, step: "sent", consent: false, error: null };
    case "restart":
      return { ...state, step: "slot", date: null, minute: null, partySize: null, error: null };
  }
}

function getBookingError(error: unknown): BookingError {
  const code = getTrpcErrorCode(error);

  if (code === "CONFLICT") return "full";
  if (code === "BAD_REQUEST" || code === "NOT_FOUND") return "unavailable";
  if (code === "TOO_MANY_REQUESTS") return "throttled";
  return "generic";
}

interface BookingFlowInput {
  host: string;
  trpc: TrpcOptionsProxy;
  /** The site language: emails and the WhatsApp check use it. */
  language: string;
  initialMonth: string;
  defaultPrefix: string;
  rememberedEmail: string | null;
  onSent: (email: string) => void;
}

export function useBookingFlow({
  host,
  trpc,
  language,
  initialMonth,
  defaultPrefix,
  rememberedEmail,
  onSent,
}: BookingFlowInput) {
  const queryClient = useQueryClient();
  const [state, dispatch] = useReducer(bookingReducer, {
    step: "slot",
    month: initialMonth,
    date: null,
    minute: null,
    partySize: null,
    contact: { name: "", prefix: defaultPrefix, phone: "", email: rememberedEmail ?? "" },
    invalid: [],
    consent: false,
    error: null,
  });
  const availability = useQuery(getAvailabilityQueryOptions({ host, month: state.month, trpc }));
  const create = useMutation(getReservationMutationOptions(trpc).create);

  function checkContact() {
    const invalid: ContactField[] = [];
    if (!state.contact.name.trim()) invalid.push("name");
    if (!toE164({ prefix: state.contact.prefix, number: state.contact.phone })) invalid.push("phone");
    if (!isEmail(state.contact.email)) invalid.push("email");
    dispatch({ type: "contactChecked", invalid });
  }

  async function submit() {
    const phone = toE164({ prefix: state.contact.prefix, number: state.contact.phone });
    if (!state.consent) return dispatch({ type: "failed", error: "consent" });
    if (!state.date || state.minute === null || !state.partySize || !phone || create.isPending) return;

    try {
      await create.mutateAsync({
        host,
        date: state.date,
        minute: state.minute,
        partySize: state.partySize,
        name: state.contact.name.trim(),
        phone,
        email: state.contact.email.trim().toLowerCase(),
        consent: true,
        language,
      });
      dispatch({ type: "sent" });
      onSent(state.contact.email.trim().toLowerCase());
    } catch (error) {
      dispatch({ type: "failed", error: getBookingError(error) });
    } finally {
      await queryClient.invalidateQueries({ queryKey: trpc.reservations.pathKey() });
    }
  }

  return {
    ...state,
    availability,
    sending: create.isPending,
    setMonth: (month: string) => dispatch({ type: "month", month }),
    pickDate: (date: string) => dispatch({ type: "date", date }),
    pickSlot: (minute: number) => dispatch({ type: "slot", minute }),
    pickParty: (partySize: number) => dispatch({ type: "party", partySize }),
    setField: (field: ContactField, value: string) => dispatch({ type: "field", field, value }),
    setConsent: (consent: boolean) => dispatch({ type: "consent", consent }),
    back: () => dispatch({ type: "back" }),
    restart: () => dispatch({ type: "restart" }),
    checkContact,
    submit,
  };
}

export type BookingFlow = ReturnType<typeof useBookingFlow>;
