import { ImageGalleryControl } from "~/shared/images/image-gallery-control";

import { useBranchForm } from "../branch-form-context-value";

export function GallerySection() {
  const { controller } = useBranchForm();
  return (
    <section className="admin-editor-section">
      <div className="admin-kicker">Imágenes públicas</div>
      <div className="admin-branch-media-grid">
        <ImageGalleryControl
          disabled={controller.pending}
          drafts={controller.gallery.drafts}
          error={controller.gallery.error}
          label="Galería de la sucursal"
          onAdd={controller.gallery.addFiles}
          onMove={controller.gallery.move}
          onRemove={controller.gallery.remove}
          onReplace={controller.gallery.replace}
        />
      </div>
    </section>
  );
}
