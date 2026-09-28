import { i18n } from "~/lib/i18n";
import { ImageGalleryControl } from "~/shared/images/image-gallery-control";

import { useBranchForm } from "../branch-form-context-value";

export function GallerySection() {
  const { controller } = useBranchForm();
  return (
    <section className="admin-editor-section">
      <h2 className={"ming-section__title"}>{i18n.t("branch___Galería de la sucursal")}</h2>
      <div className="admin-branch-media-grid">
        <ImageGalleryControl
          disabled={controller.pending}
          drafts={controller.gallery.drafts}
          error={controller.gallery.error}
          label={i18n.t("branch___Galería de la sucursal")}
          onAdd={controller.gallery.addFiles}
          onMove={controller.gallery.move}
          onRemove={controller.gallery.remove}
          onReplace={controller.gallery.replace}
        />
      </div>
    </section>
  );
}
