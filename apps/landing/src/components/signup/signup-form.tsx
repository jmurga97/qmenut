import { Button, InlineMessage } from "@jmurga97/components";
import { useCallback, useEffect, useState } from "react";

import { AccountStep, BrandStep, CodeStep, COUNTRIES, RestaurantStep } from "./signup-steps";
import { Preview } from "./signup-widgets";
import { callApi } from "../../lib/api";
import { DEFAULT_TENANT_COLORS } from "../../lib/theme-preview";

import type { Draft } from "./signup-steps";
import type { SubmitEvent } from "react";

type Step = "restaurant" | "brand" | "account" | "code";
type SlugCheck = { slug: string; host: string | null; problem: string | null };

const STEPS: { id: Step; label: string }[] = [
  { id: "restaurant", label: "Restaurante" },
  { id: "brand", label: "Marca" },
  { id: "account", label: "Cuenta" },
];
const NEXT_LABEL: Record<Step, string> = {
  restaurant: "Siguiente",
  brand: "Siguiente",
  account: "Enviar código",
  code: "Crear mi web",
};

const EMPTY_DRAFT: Draft = {
  name: "",
  country: "VEN",
  slug: null,
  template: "her",
  primary: DEFAULT_TENANT_COLORS.primary,
  secondary: DEFAULT_TENANT_COLORS.secondary,
  ownerName: "",
  email: "",
  phone: "",
  terms: false,
  marketing: false,
  token: null,
  code: "",
};

// "La Tasca de Pepe" → "la-tasca-de-pepe".
function slugify(name: string): string {
  const words = name
    .normalize("NFD")
    .replaceAll(/[̀-ͯ]/g, "")
    .toLowerCase()
    .split(/[^a-z0-9]+/);
  return words.filter(Boolean).join("-").slice(0, 40);
}

/** Debounced availability check of the subdomain as it is typed. */
function useSlugCheck(slug: string): SlugCheck | null {
  const [check, setCheck] = useState<SlugCheck | null>(null);
  useEffect(() => {
    if (slug.length < 3) return;
    const timer = setTimeout(() => {
      callApi<Omit<SlugCheck, "slug">>({ path: "signup.checkSubdomain", input: { slug }, query: true })
        .then((result) => setCheck({ slug, ...result }))
        .catch(() => setCheck(null));
    }, 350);
    return () => clearTimeout(timer);
  }, [slug]);
  return check?.slug === slug ? check : null;
}

function createTrial(draft: Draft, slug: string) {
  const phone = draft.phone.replaceAll(/\D/g, "").replace(/^0+/, "");
  return callApi<{ adminUrl: string }>({
    path: "signup.createTrial",
    input: {
      email: draft.email,
      code: draft.code,
      restaurant: { name: draft.name, countryCode: draft.country, slug },
      theme: { template: draft.template, primary: draft.primary, secondary: draft.secondary },
      owner: {
        name: draft.ownerName,
        phone: `${COUNTRIES[draft.country].prefix}${phone}`,
        marketingConsent: draft.marketing,
      },
      termsAccepted: true,
    },
  });
}

export function SignupForm({ market }: { market: "es" | "ve" }) {
  const [step, setStep] = useState<Step>("restaurant");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // A Turnstile token is single-use; a failed request remounts the widget for a fresh one.
  const [turnstileKey, setTurnstileKey] = useState(0);
  const [draft, setDraft] = useState<Draft>(() => ({ ...EMPTY_DRAFT, country: market === "es" ? "ESP" : "VEN" }));
  const update = useCallback((patch: Partial<Draft>) => setDraft((current) => ({ ...current, ...patch })), []);

  const slug = draft.slug ?? slugify(draft.name);
  const check = useSlugCheck(slug);
  const slugProblem = slug.length > 0 && slug.length < 3 ? "Mínimo 3 caracteres" : (check?.problem ?? null);
  const blocked =
    (step === "restaurant" && (!check?.host || Boolean(slugProblem))) ||
    (step === "account" && (!draft.terms || !draft.token));

  function send(action: () => Promise<void>) {
    setBusy(true);
    setError(null);
    action()
      .catch((error_: unknown) => {
        setError(error_ instanceof Error ? error_.message : "Algo falló. Inténtalo de nuevo.");
        if (step === "account") setTurnstileKey((key) => key + 1);
      })
      .finally(() => setBusy(false));
  }

  function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (blocked) return;
    if (step === "restaurant") setStep("brand");
    if (step === "brand") setStep("account");
    if (step === "account") {
      send(async () => {
        await callApi({ path: "signup.requestCode", input: { email: draft.email, turnstileToken: draft.token } });
        setStep("code");
      });
    }
    if (step === "code") {
      send(async () => {
        const { adminUrl } = await createTrial(draft, slug);
        window.location.assign(adminUrl);
      });
    }
  }

  const stepIndex = STEPS.findIndex((item) => item.id === step);
  const props = { draft, update };

  return (
    <form className={`signup signup--${step}`} onSubmit={submit}>
      <ol aria-label="Pasos" className="signup-steps">
        {STEPS.map((item, index) => (
          <li aria-current={item.id === step ? "step" : undefined} key={item.id}>
            {`${index + 1}. ${item.label}`}
          </li>
        ))}
      </ol>
      <div className="signup-body">
        <div className="signup-fields">
          {step === "restaurant" ? (
            <RestaurantStep {...props} host={check?.host ?? null} problem={slugProblem} slug={slug} />
          ) : null}
          {step === "brand" ? <BrandStep {...props} /> : null}
          {step === "account" ? <AccountStep {...props} key={turnstileKey} /> : null}
          {step === "code" ? <CodeStep {...props} /> : null}
          {error ? <InlineMessage message={error} tone="error" /> : null}
          <div className="actions">
            {stepIndex > 0 ? (
              <Button onClick={() => setStep(STEPS[stepIndex - 1]?.id ?? "restaurant")} type="button" variant="ghost">
                Atrás
              </Button>
            ) : null}
            <Button disabled={busy || blocked} type="submit">
              {busy ? "Un momento…" : NEXT_LABEL[step]}
            </Button>
          </div>
        </div>
        {step === "brand" ? (
          <Preview primary={draft.primary} secondary={draft.secondary} template={draft.template} />
        ) : null}
      </div>
    </form>
  );
}
