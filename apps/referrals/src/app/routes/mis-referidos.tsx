import { createFileRoute } from "@tanstack/react-router";

import { AccountPage } from "~/features/account/account-page";

export const Route = createFileRoute("/mis-referidos")({ component: AccountPage });
