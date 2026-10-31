import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import {
  getEmailFromLinkQueryOptions,
  getGuestReservationsQueryOptions,
  getReservationMutationOptions,
} from "~/features/reservations/api/reservations-query-options";
import { isEmail } from "~/features/reservations/reservation-format";
import { useStoredString } from "~/shared/hooks/use-stored-string";

import type { TrpcOptionsProxy } from "~/lib/trpc-client";

interface GuestReservationsInput {
  host: string;
  trpc: TrpcOptionsProxy;
  /** The reservation id from an email's manage link (ADR 0008). */
  linkId?: string;
}

/** ADR 0004: the email alone opens a guest's reservations; this browser remembers the last one used. */
export function useGuestReservations({ host, trpc, linkId }: GuestReservationsInput) {
  const queryClient = useQueryClient();
  const { value: storedEmail, setValue: setEmail } = useStoredString(`qm-reservations-email:${host}`);
  const [draft, setDraft] = useState("");
  const [actionError, setActionError] = useState(false);
  const [dismissedLinkId, setDismissedLinkId] = useState<string>();
  const useLink = !!linkId && linkId !== dismissedLinkId;
  const link = useQuery({
    ...getEmailFromLinkQueryOptions({ host, reservationId: linkId ?? "", trpc }),
    enabled: useLink,
  });
  // An email link takes priority over the last guest remembered on this device, including while it loads or fails.
  const linkedEmail = useLink ? link.data?.email : undefined;
  const email = useLink ? (linkedEmail ?? null) : storedEmail;
  const list = useQuery({ ...getGuestReservationsQueryOptions({ host, email: email ?? "", trpc }), enabled: !!email });
  const mutations = getReservationMutationOptions(trpc);
  const confirmMutation = useMutation(mutations.confirm);
  const cancelMutation = useMutation(mutations.cancel);

  useEffect(() => {
    if (linkedEmail) setEmail(linkedEmail);
  }, [linkedEmail, setEmail]);

  function remember(nextEmail: string | null) {
    setDismissedLinkId(linkId);
    setEmail(nextEmail);
  }

  async function answer(mutation: typeof cancelMutation, reservationId: string) {
    if (!email || confirmMutation.isPending || cancelMutation.isPending) return;
    setActionError(false);

    try {
      await mutation.mutateAsync({ host, email, reservationId });
    } catch {
      setActionError(true);
    }
    await queryClient.invalidateQueries({ queryKey: trpc.reservations.pathKey() });
  }

  return {
    email,
    remember,
    forget: () => remember(null),
    draft,
    setDraft,
    lookup: () => isEmail(draft) && remember(draft.trim().toLowerCase()),
    linkLoading: useLink && link.isPending,
    linkFailed: useLink && link.isError && !linkedEmail,
    retryLink: () => void link.refetch(),
    reservations: list.data ?? [],
    loading: list.isLoading,
    loadFailed: list.isError,
    // Confirming is a tap on this page, never the link itself: email scanners open links.
    confirm: (reservationId: string) => answer(confirmMutation, reservationId),
    confirmingId: confirmMutation.isPending ? confirmMutation.variables.reservationId : null,
    cancel: (reservationId: string) => answer(cancelMutation, reservationId),
    cancellingId: cancelMutation.isPending ? cancelMutation.variables.reservationId : null,
    actionError,
  };
}

export type GuestReservations = ReturnType<typeof useGuestReservations>;
