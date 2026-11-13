import { Button, Field, InlineMessage, Input } from "@jmurga97/components";
import { onboardingIntakeSchema } from "@qmenut/db/domain/onboarding-intake";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useParams } from "@tanstack/react-router";
import { useDeferredValue, useState } from "react";

import { trpc } from "~/lib/trpc";

import type { OnboardingIntake, OnboardingIntakeInput } from "@qmenut/db/domain/onboarding-intake";
import type { FormEvent } from "react";

type Draft = {
  restaurantName: string;
  subdomain: string;
  address: string;
  phone: string;
  whatsapp: string;
  instagram: string;
  ownerName: string;
  ownerEmail: string;
  legalName: string;
  taxId: string;
  legalAddress: string;
  privacyEmail: string;
  menuUrl: string;
  notes: string;
};
type Key = keyof Draft;
type Country = "ESP" | "VEN";

const PREFIX: Record<Country, string> = { ESP: "+34", VEN: "+58" };

// "La Tasca de Pepe" → "la-tasca-de-pepe", the same rule as the demo signup.
function slugify(name: string): string {
  return name
    .normalize("NFD")
    .replaceAll(/[̀-ͯ]/g, "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
    .join("-")
    .slice(0, 40);
}

// Owners type "600 00 00 00" or "0412-000-0000"; the schema wants "+34600000000" / "+584120000000".
function withPrefix(value: string, country: Country): string {
  const digits = value.replaceAll(/\D/g, "");
  if (!digits) return "";
  const prefix = PREFIX[country];
  if (value.trim().startsWith("+")) return `+${digits}`;
  return `${prefix}${digits.replace(/^0+/, "")}`;
}

function toInput(draft: Draft, country: Country): OnboardingIntakeInput {
  const common = {
    ...draft,
    subdomain: draft.subdomain || slugify(draft.restaurantName),
    phone: withPrefix(draft.phone, country),
    whatsapp: withPrefix(draft.whatsapp, country),
    legalAddress: draft.legalAddress || draft.address,
  };
  // Venezuela has no privacy email: the schema drops the extra key and the export uses the owner's.
  if (country === "VEN") return { ...common, countryCode: "VEN" };
  return { ...common, countryCode: "ESP", privacyEmail: draft.privacyEmail || draft.ownerEmail };
}

function fromSaved({
  saved,
  label,
  contactEmail,
}: {
  saved: OnboardingIntake | null;
  label: string;
  contactEmail: string;
}): Draft {
  if (!saved)
    return {
      restaurantName: label,
      subdomain: "",
      address: "",
      phone: "",
      whatsapp: "",
      instagram: "",
      ownerName: "",
      ownerEmail: contactEmail,
      legalName: "",
      taxId: "",
      legalAddress: "",
      privacyEmail: "",
      menuUrl: "",
      notes: "",
    };
  return {
    restaurantName: saved.restaurantName,
    subdomain: saved.subdomain,
    address: saved.address,
    phone: saved.phone,
    whatsapp: saved.whatsapp,
    instagram: saved.instagram,
    ownerName: saved.ownerName,
    ownerEmail: saved.ownerEmail,
    legalName: saved.legalName,
    taxId: saved.taxId,
    legalAddress: saved.legalAddress,
    privacyEmail: saved.countryCode === "ESP" ? saved.privacyEmail : "",
    menuUrl: saved.menuUrl,
    notes: saved.notes,
  };
}

/** Live availability of the subdomain, through the demo signup's own check. */
function SubdomainHint({ slug }: { slug: string }) {
  const deferred = useDeferredValue(slug);
  const check = useQuery({
    ...trpc.signup.checkSubdomain.queryOptions({ slug: deferred }),
    enabled: deferred.length >= 3,
  });
  if (deferred.length < 3) return <>Tu web: {slug || "turestaurante"}.qmenut.app</>;
  if (check.data?.problem) return <>{check.data.problem}</>;
  return <>Tu web: {deferred}.qmenut.app</>;
}

function IntakeForm({ country, initial, token }: { country: Country; initial: Draft; token: string }) {
  const [draft, setDraft] = useState(initial);
  const [problems, setProblems] = useState<Partial<Record<string, string>>>({});
  const [sent, setSent] = useState(false);
  const submit = useMutation(trpc.onboarding.submit.mutationOptions({ onSuccess: () => setSent(true) }));
  const slug = draft.subdomain || slugify(draft.restaurantName);

  const field = (key: Key, options: { label: string; type?: string; hint?: string; required?: boolean }) => (
    <Field
      error={problems[key]}
      hint={options.hint}
      invalid={Boolean(problems[key])}
      label={options.label}
      required={options.required ?? true}
    >
      <Input
        onValueChange={(value) => setDraft((current) => ({ ...current, [key]: value }))}
        type={options.type ?? "text"}
        value={draft[key]}
      />
    </Field>
  );

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = onboardingIntakeSchema.safeParse(toInput(draft, country));
    if (!result.success) {
      setProblems(Object.fromEntries(result.error.issues.map((issue) => [String(issue.path[0]), "Revisa este dato"])));
      return;
    }
    setProblems({});
    submit.mutate({ token, data: result.data });
  }

  if (sent)
    return (
      <main className="ming-page onboarding-page">
        <h1>¡Gracias!</h1>
        <p>Hemos recibido tus datos. Te escribiremos cuando tu web esté lista.</p>
        <p>Puedes volver a este enlace para corregir algo hasta que demos de alta tu restaurante.</p>
        <Button onClick={() => setSent(false)} variant="secondary">
          Corregir datos
        </Button>
      </main>
    );

  return (
    <main className="ming-page onboarding-page">
      <h1>Alta de {draft.restaurantName || "tu restaurante"} en QMenut</h1>
      <p>Con estos datos creamos tu web. Te lleva unos 3 minutos; colores, horarios e idiomas los eliges después.</p>
      <form className="onboarding-form" noValidate onSubmit={save}>
        <fieldset>
          <legend>Tu restaurante</legend>
          {field("restaurantName", { label: "Nombre del restaurante" })}
          <Field
            error={problems.subdomain}
            hint={<SubdomainHint slug={slug} />}
            invalid={Boolean(problems.subdomain)}
            label="Dirección de tu web"
            required
          >
            <div className="onboarding-slug">
              <Input
                onValueChange={(value) => setDraft((current) => ({ ...current, subdomain: value.toLowerCase() }))}
                value={slug}
              />
              <span>.qmenut.app</span>
            </div>
          </Field>
          {field("address", { label: "Dirección del local" })}
          {field("phone", { label: "Teléfono", type: "tel", hint: `Con o sin ${PREFIX[country]}` })}
          {field("whatsapp", { label: "WhatsApp", type: "tel", required: false, hint: "Si es distinto del teléfono" })}
          {field("instagram", { label: "Instagram", type: "url", required: false, hint: "https://instagram.com/…" })}
        </fieldset>
        <fieldset>
          <legend>Acceso al panel</legend>
          {field("ownerName", { label: "Tu nombre" })}
          {field("ownerEmail", {
            label: "Correo",
            type: "email",
            hint: "Entrarás al panel con un código que llega aquí.",
          })}
        </fieldset>
        <fieldset>
          <legend>Datos legales</legend>
          <p className="onboarding-note">Aparecen en el aviso legal y la política de privacidad de tu web.</p>
          {field("legalName", { label: "Razón social" })}
          {field("taxId", {
            label: country === "ESP" ? "NIF / CIF" : "RIF",
            hint: country === "ESP" ? "Ej.: B12345678" : "Ej.: J-12345678-9",
          })}
          {field("legalAddress", {
            label: "Dirección fiscal",
            required: false,
            hint: "Si la dejas vacía, usamos la del local.",
          })}
          {country === "ESP"
            ? field("privacyEmail", {
                label: "Correo para privacidad",
                type: "email",
                required: false,
                hint: "Si lo dejas vacío, usamos tu correo.",
              })
            : null}
        </fieldset>
        <fieldset>
          <legend>Tu carta</legend>
          {field("menuUrl", {
            label: "Enlace a tu carta",
            type: "url",
            required: false,
            hint: "Web, PDF en Drive, Instagram… Si no tienes enlace, te la pedimos por WhatsApp.",
          })}
          {field("notes", { label: "Algo más que debamos saber", required: false })}
        </fieldset>
        {Object.keys(problems).length > 0 ? <InlineMessage message="Revisa los campos marcados." tone="error" /> : null}
        {submit.error ? <InlineMessage message={submit.error.message} tone="error" /> : null}
        <Button disabled={submit.isPending} type="submit">
          {submit.isPending ? "Enviando…" : "Enviar datos"}
        </Button>
      </form>
    </main>
  );
}

export function OnboardingPage() {
  const { token } = useParams({ from: "/alta/$token" });
  const query = useQuery({ ...trpc.onboarding.get.queryOptions({ token }), retry: false });
  if (query.isPending)
    return (
      <main className="ming-page onboarding-page">
        <p>Cargando…</p>
      </main>
    );
  if (query.isError)
    return (
      <main className="ming-page onboarding-page">
        <h1>Enlace no disponible</h1>
        <p>{query.error.message}</p>
      </main>
    );
  const { countryCode, contactEmail, data, label } = query.data;
  return <IntakeForm country={countryCode} initial={fromSaved({ saved: data, label, contactEmail })} token={token} />;
}
