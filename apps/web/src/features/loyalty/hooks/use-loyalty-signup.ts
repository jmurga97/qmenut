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
  const [email, setEmail] = useState("");
  const mutation = useMutation(getLoyaltyMutationOptions(trpc).createCard);

  async function submit(nextEmail: string): Promise<void> {
    mutation.reset();

    try {
      const result = await mutation.mutateAsync({ host, email: nextEmail });
      setToken(result.cardToken);
    } catch {
      // The mutation exposes the translated error through the controller model.
    }
  }

  return {
    busy: mutation.isPending,
    email,
    error: mutation.isError,
    setEmail,
    submit,
  };
}
