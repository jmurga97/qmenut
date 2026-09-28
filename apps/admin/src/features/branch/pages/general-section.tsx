import { i18n } from "~/lib/i18n";
import { FormPhoneInput } from "~/shared/components/forms/adapters/form-phone-input";
import { FormSelect } from "~/shared/components/forms/adapters/form-select";
import { FormTextInput } from "~/shared/components/forms/adapters/form-text-input";
import { SingleImageUploadControl } from "~/shared/images/single-image-upload-control";

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
        <h2 className={"ming-section__title"}>{i18n.t("branch___Identidad y contacto")}</h2>
        <div className={"admin-form-grid admin-form-grid--two"}>
          <FormTextInput<BranchFormValues> label={i18n.t("branch___Nombre")} name={"name"} />
          <FormPhoneInput<BranchFormValues> label={i18n.t("branch___Teléfono")} name={"phone"} />
          <FormPhoneInput<BranchFormValues> label={i18n.t("branch___WhatsApp")} name={"whatsapp"} />
          <FormSelect<BranchFormValues>
            label={i18n.t("branch___Zona horaria del restaurante")}
            name={"timezone"}
            options={TIMEZONE_OPTIONS}
          />
          <BranchAddressAutocomplete branchId={branchId} onResolveChange={controller.setResolvePending} />
        </div>
      </section>
      <SocialLinksEditor />
      <section className="admin-editor-section">
        <h2 className={"ming-section__title"}>{i18n.t("branch___Imágenes públicas")}</h2>
        <div className="admin-branch-media-grid">
          <SingleImageUploadControl
            disabled={controller.pending}
            draft={controller.logo.draft}
            label={i18n.t("branch___Logo (icono de la app)")}
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
