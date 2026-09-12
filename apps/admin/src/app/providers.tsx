import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";

import { queryClient } from "~/lib/query-client";

import type { ReactNode } from "react";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster position="top-right" theme="system" duration={4000} />
    </QueryClientProvider>
  );
}
