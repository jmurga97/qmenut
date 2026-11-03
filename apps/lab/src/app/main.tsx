import "./styles/fonts.css";
import "@jmurga97/components/styles.css";
import "./styles/layout.css";
import "./styles/app.css";
import { QueryClientProvider } from "@tanstack/react-query";
import { createRouter, RouterProvider } from "@tanstack/react-router";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Toaster } from "sonner";

import { routeTree } from "~/app/route-tree.gen";
import { queryClient } from "~/lib/query-client";

const router = createRouter({ routeTree, defaultPreload: "intent" });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

const container = document.querySelector("#root");
if (!container) throw new Error("No se encontró #root");

createRoot(container).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <Toaster position={"top-right"} theme={"system"} duration={5000} />
    </QueryClientProvider>
  </StrictMode>,
);
