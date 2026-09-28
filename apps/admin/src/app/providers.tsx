import { QueryClientProvider } from "@tanstack/react-query";
import { I18nextProvider } from "react-i18next";
import { Toaster } from "sonner";

import { i18n } from "~/lib/i18n";
import { queryClient } from "~/lib/query-client";

import type { ReactNode } from "react";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <I18nextProvider i18n={i18n}>
      <QueryClientProvider client={queryClient}>
        {children}
        <Toaster
          position={"top-right"}
          theme={"system"}
          duration={4000}
          toastOptions={{
            style: {
              background: "var(--popover)",
              color: "var(--popover-foreground)",
              border: "1px solid var(--input)",
              borderRadius: "var(--radius)",
              boxShadow: "none",
              fontFamily: "var(--font-sans)",
            },
          }}
        />
      </QueryClientProvider>
    </I18nextProvider>
  );
}
