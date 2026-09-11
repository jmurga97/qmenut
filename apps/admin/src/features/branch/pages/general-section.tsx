import { FormPhoneInput } from "~/shared/components/forms/adapters/form-phone-input";
import { FormSelect } from "~/shared/components/forms/adapters/form-select";
import { FormTextInput } from "~/shared/components/forms/adapters/form-text-input";
import { ImageUploadControl } from "~/shared/images/image-upload-control";

import { useBranchForm } from "../branch-form-context-value";
import { BranchAddressAutocomplete } from "../components/branch-address-autocomplete";
import { GoogleReviewsSettings } from "../components/google-reviews-settings";
import { SocialLinksEditor } from "../components/social-links-editor";
import { TIMEZONE_OPTIONS } from "../types";

import type { BranchFormValues } from "../types";

export function GeneralSection() {
  const { branchId, controller } = useBranchForm();
  return (
    <>
      <section className="admin-editor-section">
        <div className="admin-kicker">Identidad y contacto</div>
        <div className="admin-form-grid admin-form-grid--two">
          <FormTextInput<BranchFormValues> label="Nombre" name="name" />
          <FormPhoneInput<BranchFormValues> label="Teléfono" name="phone" />
          <FormTextInput<BranchFormValues> label="WhatsApp" name="whatsapp" />
          <FormSelect<BranchFormValues>
            label="Zona horaria del restaurante"
            name="timezone"
            options={TIMEZONE_OPTIONS}
          />
          <BranchAddressAutocomplete branchId={branchId} onResolveChange={controller.setResolvePending} />
        </div>
      </section>
      <SocialLinksEditor />
      <section className="admin-editor-section">
        <div className="admin-kicker">Imágenes públicas</div>
        <div className="admin-branch-media-grid">
          <ImageUploadControl
            disabled={controller.pending}
            draft={controller.logo.draft}
            label="Logo (icono de la app)"
            logo
            onRemove={controller.logo.remove}
            onSelect={controller.logo.selectFile}
          />
        </div>
      </section>
      <GoogleReviewsSettings
        address={controller.settings.address}
        branchId={branchId}
        branchName={controller.settings.name}
        enabled={controller.settings.googleReviewsEnabled}
        placeId={controller.settings.googlePlaceId}
      />
    </>
  );
}
