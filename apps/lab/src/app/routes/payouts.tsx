import { createFileRoute } from "@tanstack/react-router";

import { PayoutsPage } from "~/features/payouts/payouts-page";

export const Route = createFileRoute("/payouts")({ component: PayoutsPage });
