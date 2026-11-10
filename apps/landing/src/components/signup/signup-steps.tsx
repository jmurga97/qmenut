import { Checkbox, Field, Input, Select } from "@jmurga97/components";

import { Turnstile } from "./signup-widgets";

import type { Template } from "./signup-widgets";

export type Country = "ESP" | "VEN";

export interface Draft {
  name: string;
  country: Country;
  slug: string | null;
  template: Template;
  primary: string;
  secondary: string;
  ownerName: string;
  email: string;
  phone: string;
  terms: boolean;
  marketing: boolean;
  token: string | null;
  code: string;
}

export interface StepProps {
  draft: Draft;
  update: (patch: Partial<Draft>) => void;
}

export const COUNTRIES: Record<Country, { label: string; prefix: string }> = {
  VEN: { label: "Venezuela", prefix: "+58" },
  ESP: { label: "España", prefix: "+34" },
};

const TEMPLATES: { id: Template; label: string }[] = [
  { id: "her", label: "Herencia" },
  { id: "fine", label: "Alta cocina" },
  { id: "cafe", label: "Cafetería" },
  { id: "tapas", label: "Bar de tapas" },
  { id: "fast", label: "Comida rápida" },
];

export function RestaurantStep({
  draft,
  update,
  slug,
  host,
  problem,
}: StepProps & { slug: string; host: string | null; problem: string | null }) {
  return (
    <>
      <Field label="Nombre del restaurante" required>
        <Input
          autoFocus
          maxLength={80}
          minLength={2}
          onValueChange={(name) => update({ name })}
          required
          value={draft.name}
        />
      </Field>
      <Field label="País">
        <Select
          ariaLabel="País"
          onValueChange={(value) => update({ country: value === "ESP" ? "ESP" : "VEN" })}
          options={Object.entries(COUNTRIES).map(([id, item]) => ({ id, label: item.label }))}
          value={draft.country}
        />
      </Field>
      <Field
        error={problem}
        hint={host && !problem ? `Tu web: https://${host}` : "Tu web en qmenut.app"}
        invalid={Boolean(problem)}
        label="Subdominio"
        required
      >
        <div className="signup-slug">
          <Input
            maxLength={40}
            onValueChange={(value) => update({ slug: value.toLowerCase() })}
            required
            value={slug}
          />
          <span>.qmenut.app</span>
        </div>
      </Field>
    </>
  );
}

export function BrandStep({ draft, update }: StepProps) {
  return (
    <>
      <Field label="Plantilla">
        <Select
          ariaLabel="Plantilla"
          onValueChange={(value) => update({ template: TEMPLATES.find((item) => item.id === value)?.id ?? "her" })}
          options={TEMPLATES}
          value={draft.template}
        />
      </Field>
      <div className="signup-colors">
        <Field label="Color principal">
          <input
            onChange={(event) => update({ primary: event.currentTarget.value })}
            type="color"
            value={draft.primary}
          />
        </Field>
        <Field label="Color secundario">
          <input
            onChange={(event) => update({ secondary: event.currentTarget.value })}
            type="color"
            value={draft.secondary}
          />
        </Field>
      </div>
      <p className="signup-note">El logo, las fotos y tus platos los subes después, desde el panel.</p>
    </>
  );
}

export function AccountStep({ draft, update }: StepProps) {
  return (
    <>
      <Field label="Tu nombre" required>
        <Input
          autoComplete="name"
          maxLength={80}
          minLength={2}
          onValueChange={(ownerName) => update({ ownerName })}
          required
          value={draft.ownerName}
        />
      </Field>
      <Field hint="Te enviaremos un código para entrar. Sin contraseña." label="Correo" required>
        <Input
          autoComplete="email"
          onValueChange={(email) => update({ email })}
          required
          type="email"
          value={draft.email}
        />
      </Field>
      <Field hint="Para ayudarte por WhatsApp si lo necesitas." label="Teléfono" required>
        <div className="signup-slug">
          <span>{COUNTRIES[draft.country].prefix}</span>
          <Input
            autoComplete="tel-national"
            inputMode="tel"
            onValueChange={(phone) => update({ phone })}
            pattern="[\d\s]{7,15}"
            required
            value={draft.phone}
          />
        </div>
      </Field>
      <Checkbox
        checked={draft.terms}
        label="Acepto las condiciones del servicio y la política de privacidad."
        onCheckedChange={(value) => update({ terms: value === true })}
        required
      />
      <Checkbox
        checked={draft.marketing}
        label="Quiero recibir novedades y consejos de Qmenut (opcional)."
        onCheckedChange={(value) => update({ marketing: value === true })}
      />
      <Turnstile onToken={update} />
    </>
  );
}

export function CodeStep({ draft, update }: StepProps) {
  return (
    <Field hint={`Lo enviamos a ${draft.email}. Caduca en 5 minutos.`} label="Código de 6 dígitos" required>
      <Input
        autoComplete="one-time-code"
        autoFocus
        inputMode="numeric"
        maxLength={6}
        onValueChange={(value) => update({ code: value.replaceAll(/\D/g, "") })}
        pattern="\d{6}"
        required
        value={draft.code}
      />
    </Field>
  );
}
