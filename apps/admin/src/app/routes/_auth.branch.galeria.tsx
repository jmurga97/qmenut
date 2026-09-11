import { createFileRoute } from "@tanstack/react-router";

import { GallerySection } from "~/features/branch/pages/gallery-section";

export const Route = createFileRoute("/_auth/branch/galeria")({
  component: GallerySection,
});
