import { createFileRoute } from "@tanstack/react-router";

import { LeadsPage } from "~/features/leads/leads-page";

export const Route = createFileRoute("/leads")({ component: LeadsPage });
