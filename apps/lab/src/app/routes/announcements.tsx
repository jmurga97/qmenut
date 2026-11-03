import { createFileRoute } from "@tanstack/react-router";

import { AnnouncementsPage } from "~/features/announcements/announcements-page";

export const Route = createFileRoute("/announcements")({ component: AnnouncementsPage });
