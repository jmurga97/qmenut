import { i18n } from "~/lib/i18n";
import { useFeature } from "~/shared/hooks/use-can";
import { ImageGalleryControl } from "~/shared/images/image-gallery-control";

import { useBranchForm } from "../branch-form-context-value";

export function GallerySection() {
  const { controller } = useBranchForm();
  // Basic shows only the cover photo; a gallery kept from Business can still be trimmed.
  const hasGallery = useFeature("contact.gallery");
  return (
    <section className="admin-editor-section">
      <h2 className={"ming-section__title"}>{i18n.t("branch___Galería de la sucursal")}</h2>
      <div className="admin-branch-media-grid">
        <ImageGalleryControl
          disabled={controller.pending}
          drafts={controller.gallery.drafts}
          error={controller.gallery.error}
          label={i18n.t("branch___Galería de la sucursal")}
          maximum={hasGallery ? undefined : 1}
          onAdd={controller.gallery.addFiles}
          onMove={controller.gallery.move}
          onRemove={controller.gallery.remove}
          onReplace={controller.gallery.replace}
        />
      </div>
      {hasGallery ? null : (
        <p className="admin-copy">
          {i18n.t(
            "branch___En el plan Básico la carta muestra solo la foto de portada. La galería es del plan Business.",
          )}
        </p>
      )}
    </section>
  );
}
