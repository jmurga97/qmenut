import { Share, Smartphone, X } from "lucide-react";
import { useTranslation } from "react-i18next";

import { useInstallPrompt } from "~/features/install/use-install-prompt";

const TITLE_ID = "install-card-title";

export function InstallCard() {
  const { t } = useTranslation();
  const { dismiss, install, mode } = useInstallPrompt();

  if (mode === "hidden") {
    return null;
  }

  const isIos = mode === "ios-instructions";

  return (
    <section aria-labelledby={TITLE_ID} className="install-card">
      <button aria-label={t("install.dismissLabel")} className="install-card__dismiss" onClick={dismiss} type="button">
        <X aria-hidden="true" size={16} strokeWidth={2} />
      </button>

      <Smartphone aria-hidden="true" className="install-card__icon" size={26} strokeWidth={1.5} />

      {/* The page header already owns the h1, so this block starts at h2. */}
      <h2 className="install-card__title" id={TITLE_ID}>
        {t(isIos ? "install.ios.title" : "install.title")}
      </h2>

      {isIos ? (
        <ol className="install-card__steps">
          <li>
            <Share aria-hidden="true" size={14} strokeWidth={2} /> {t("install.ios.step1")}
          </li>
          <li>{t("install.ios.step2")}</li>
          <li>{t("install.ios.step3")}</li>
        </ol>
      ) : (
        <>
          <p className="install-card__body">{t("install.body")}</p>
          <button className="install-card__action" onClick={install} type="button">
            {t("install.action")}
          </button>
        </>
      )}
    </section>
  );
}
