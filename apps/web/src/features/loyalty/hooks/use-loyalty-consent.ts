import { useMutation } from "@tanstack/react-query";
import { useState } from "react";

import { getLoyaltyMutationOptions } from "~/features/loyalty/api/loyalty-query-options";

import type { TrpcOptionsProxy } from "~/lib/trpc-client";

interface LoyaltyConsentInput {
  cardToken: string | null | undefined;
  host: string;
  refreshCard: () => Promise<void>;
  trpc: TrpcOptionsProxy;
}

export function useLoyaltyConsent({ cardToken, host, refreshCard, trpc }: LoyaltyConsentInput) {
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [email, setEmail] = useState("");
  const mutation = useMutation(getLoyaltyMutationOptions(trpc).acceptConsent);

  async function submit(nextEmail: string, accepted = consentAccepted): Promise<void> {
    mutation.reset();

    if (!accepted || !cardToken) {
      return;
    }

    try {
      await mutation.mutateAsync({ cardToken, consentAccepted: true, host, email: nextEmail });
      await refreshCard();
    } catch {
      // The mutation exposes the translated error through the controller model.
    }
  }

  return {
    busy: mutation.isPending,
    consentAccepted,
    email,
    error: mutation.isError,
    setConsentAccepted,
    setEmail,
    submit,
  };
}
