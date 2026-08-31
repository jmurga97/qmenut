import { useMutation } from "@tanstack/react-query";
import { useState } from "react";

import { getLoyaltyMutationOptions } from "~/features/loyalty/api/loyalty-query-options";

import type { TrpcOptionsProxy } from "~/lib/trpc-client";

interface LoyaltySignupInput {
  host: string;
  setToken: (token: string) => void;
  trpc: TrpcOptionsProxy;
}

export function useLoyaltySignup({ host, setToken, trpc }: LoyaltySignupInput) {
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [email, setEmail] = useState("");
  const mutation = useMutation(getLoyaltyMutationOptions(trpc).createCard);

  async function submit(nextEmail: string, accepted = consentAccepted): Promise<void> {
    mutation.reset();

    if (!accepted) {
      return;
    }

    try {
      const result = await mutation.mutateAsync({ consentAccepted: true, host, email: nextEmail });
      setToken(result.cardToken);
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
