import { createFileRoute } from "@tanstack/react-router";

import { IntakesPage } from "~/features/intakes/intakes-page";

export const Route = createFileRoute("/intakes")({ component: IntakesPage });
