import { createFileRoute } from "@tanstack/react-router";

import { OnboardingPage } from "~/features/onboarding/onboarding-page";

export const Route = createFileRoute("/alta/$token")({ component: OnboardingPage });
