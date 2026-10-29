import type { RouterOutputs } from "~/lib/trpc";

export type NotificationRow = RouterOutputs["admin"]["notifications"]["list"][number];
