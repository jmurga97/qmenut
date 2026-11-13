import { Button, Field, Input, Select } from "@jmurga97/components";
import { onboardingIntakeSchema } from "@qmenut/db/domain/onboarding-intake";
import {
  buildDefaultTenantThemeConfig,
  createThemePreviewUpdateMessage,
  isThemePreviewReadyMessage,
} from "@qmenut/ui/theme/tenant-theme-config";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useParams } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";

import { trpc } from "~/lib/trpc";

import type { OnboardingIntake } from "@qmenut/db/domain/onboarding-intake";

const days = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
const templates = ["fine", "her", "fast", "cafe", "tapas"] as const;
const blank = (countryCode: "ESP" | "VEN", label: string): OnboardingIntake => ({
  countryCode,
  restaurantName: label,
  languages: ["es"],
  replyEmail: "",
  vesRate: "",
  legalName: "",
  taxId: "",
  legalAddress: "",
  privacyEmail: "",
  branchName: label,
  subdomain: "",
  address: "",
  phone: countryCode === "ESP" ? "+34" : "+58",
  whatsapp: "",
  instagram: "",
  facebook: "",
  tiktok: "",
  schedules: [],
  ownerName: "",
  ownerEmail: "",
  template: "her",
  primary: "#a23a28",
  secondary: "#3f7a4b",
  tagline: "",
  menuUrl: "",
  menuByEmail: false,
  menuNotes: "",
});

type TextKey =
  | "restaurantName"
  | "replyEmail"
  | "vesRate"
  | "legalName"
  | "taxId"
  | "legalAddress"
  | "privacyEmail"
  | "branchName"
  | "subdomain"
  | "address"
  | "phone"
  | "whatsapp"
  | "instagram"
  | "facebook"
  | "tiktok"
  | "ownerName"
  | "ownerEmail"
  | "primary"
  | "secondary"
  | "tagline"
  | "menuUrl"
  | "menuNotes";
const sections: { title: string; fields: { key: TextKey; label: string; type?: string }[] }[] = [
  {
    title: "Restaurante y datos legales",
    fields: [
      { key: "restaurantName", label: "Nombre del restaurante" },
      { key: "replyEmail", label: "Correo de respuesta", type: "email" },
      { key: "legalName", label: "Razón social" },
      { key: "taxId", label: "Identificación fiscal" },
      { key: "legalAddress", label: "Dirección fiscal" },
      { key: "privacyEmail", label: "Correo de privacidad", type: "email" },
    ],
  },
  {
    title: "Local y propietario",
    fields: [
      { key: "branchName", label: "Nombre del local" },
      { key: "subdomain", label: "Subdominio deseado" },
      { key: "address", label: "Dirección del local" },
      { key: "phone", label: "Teléfono con prefijo", type: "tel" },
      { key: "whatsapp", label: "WhatsApp con prefijo", type: "tel" },
      { key: "instagram", label: "Instagram", type: "url" },
      { key: "facebook", label: "Facebook", type: "url" },
      { key: "tiktok", label: "TikTok", type: "url" },
      { key: "ownerName", label: "Nombre del propietario" },
      { key: "ownerEmail", label: "Correo de acceso al panel", type: "email" },
    ],
  },
  {
    title: "Marca y carta",
    fields: [
      { key: "primary", label: "Color principal", type: "color" },
      { key: "secondary", label: "Color secundario", type: "color" },
      { key: "tagline", label: "Eslogan" },
      { key: "menuUrl", label: "Enlace a la carta", type: "url" },
      { key: "menuNotes", label: "Notas sobre la carta" },
    ],
  },
];

function Preview({ data }: { data: OnboardingIntake }) {
  const frame = useRef<HTMLIFrameElement>(null);
  const wrapper = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [readySrc, setReadySrc] = useState("");
  const src = import.meta.env.DEV
    ? `http://${data.template}.localhost:5173/?themePreview=admin`
    : `https://${data.template}.dev.qmenut.app/?themePreview=admin`;
  const origin = new URL(src).origin;
  useEffect(() => {
    const element = wrapper.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setScale(entry.contentRect.width / 390);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const listener = (event: MessageEvent<unknown>) => {
      if (
        event.origin === origin &&
        event.source === frame.current?.contentWindow &&
        isThemePreviewReadyMessage(event.data)
      )
        setReadySrc(src);
    };
    window.addEventListener("message", listener);
    return () => window.removeEventListener("message", listener);
  }, [origin, src]);
  useEffect(() => {
    if (readySrc !== src) return;
    const defaults = buildDefaultTenantThemeConfig(data.template);
    frame.current?.contentWindow?.postMessage(
      createThemePreviewUpdateMessage({
        template: data.template,
        primary: data.primary,
        secondary: data.secondary,
        tagline: data.tagline,
        showMenuPhotos: defaults.showMenuPhotos,
        showDishPhoto: defaults.showDishPhoto,
        restaurantName: data.restaurantName,
      }),
      origin,
    );
  }, [readySrc, src, origin, data]);
  return (
    <div className="onboarding-preview" ref={wrapper}>
      <iframe
        ref={frame}
        style={{ transform: `scale(${scale})` }}
        referrerPolicy="origin"
        src={src}
        title="Vista previa de tu web"
      />
    </div>
  );
}

const fmt = (n: number | undefined) =>
  n === undefined ? "" : `${String(Math.floor(n / 60)).padStart(2, "0")}:${String(n % 60).padStart(2, "0")}`;

function ScheduleEditor({ data, setData }: { data: OnboardingIntake; setData: (data: OnboardingIntake) => void }) {
  function updateTime({
    position,
    key,
    value,
  }: {
    position: number;
    key: "openMinute" | "closeMinute";
    value: string;
  }) {
    if (!value) return;
    const [hour, minute] = value.split(":").map(Number);
    setData({
      ...data,
      schedules: data.schedules.map((entry, index) =>
        index === position ? { ...entry, [key]: hour * 60 + minute } : entry,
      ),
    });
  }
  return (
    <div>
      <h3>Horarios</h3>
      <p>Añade un horario para cada día que abras.</p>
      {days.map((day, index) => {
        const slots = data.schedules
          .map((slot, position) => ({ slot, position }))
          .filter(({ slot }) => slot.dayOfWeek === index + 1);
        return (
          <div key={day}>
            <strong>{day}</strong>
            {slots.length === 0 ? <span> · Cerrado</span> : null}
            {slots.map(({ slot, position }) => (
              <div className="onboarding-hours" key={position}>
                {(["openMinute", "closeMinute"] as const).map((key) => (
                  <Input
                    key={key}
                    type="time"
                    aria-label={`${day} ${key === "openMinute" ? "apertura" : "cierre"} ${position + 1}`}
                    value={fmt(slot[key])}
                    onChange={(event) => updateTime({ position, key, value: event.target.value })}
                  />
                ))}
                <Button
                  variant="ghost"
                  onClick={() =>
                    setData({
                      ...data,
                      schedules: data.schedules.filter((_, entryIndex) => entryIndex !== position),
                    })
                  }
                >
                  Quitar
                </Button>
              </div>
            ))}
            <Button
              variant="ghost"
              onClick={() =>
                setData({
                  ...data,
                  schedules: [...data.schedules, { dayOfWeek: index + 1, openMinute: 540, closeMinute: 1020 }],
                })
              }
            >
              Añadir horario
            </Button>
          </div>
        );
      })}
    </div>
  );
}

function VenezuelaFields({ data, setData }: { data: OnboardingIntake; setData: (data: OnboardingIntake) => void }) {
  if (data.countryCode !== "VEN") return null;
  return (
    <>
      <p>Si no indicas un correo de privacidad, usaremos el correo de respuesta.</p>
      <Field label="Tasa VES por USD (opcional)">
        <Input
          inputMode="decimal"
          value={data.vesRate}
          onChange={(event) => setData({ ...data, vesRate: event.target.value })}
        />
      </Field>
    </>
  );
}

function IntakeForm({ token, initial }: { token: string; initial: OnboardingIntake }) {
  const [data, setData] = useState(initial);
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<string[]>([]);
  const [sent, setSent] = useState(false);
  const submit = useMutation(trpc.onboarding.submit.mutationOptions({ onSuccess: () => setSent(true) }));
  const section = sections[step];
  const phonePrefix = data.countryCode === "ESP" ? "+34" : "+58";
  const taxLabel = data.countryCode === "ESP" ? "NIF/CIF" : "RIF";
  function save() {
    const result = onboardingIntakeSchema.safeParse(data);
    if (!result.success) {
      const names = Object.fromEntries(
        sections.flatMap((part) => part.fields.map((field) => [field.key, field.label])),
      );
      setErrors(
        result.error.issues.map(
          (issue) => `${names[String(issue.path[0])] ?? String(issue.path[0])}: revisa este dato`,
        ),
      );
      return;
    }
    setErrors([]);
    submit.mutate({ token, data: result.data });
  }
  if (sent)
    return (
      <div className="ming-page">
        <h1>Datos enviados</h1>
        <p>Gracias. Puedes volver a este enlace para corregirlos hasta que demos de alta tu restaurante.</p>
        <Button onClick={() => setSent(false)}>Editar datos</Button>
      </div>
    );
  return (
    <main className="ming-page onboarding-page">
      <h1>Alta de {data.restaurantName || "tu restaurante"}</h1>
      <p>
        País: {data.countryCode === "ESP" ? "España" : "Venezuela"} · Paso {step + 1} de {sections.length}
      </p>
      <h2>{section.title}</h2>
      <div className="onboarding-grid">
        <div className="onboarding-fields">
          {section.fields.map(({ key, label, type }) => (
            <Field key={key} label={key === "taxId" ? taxLabel : label}>
              <Input
                type={type ?? "text"}
                placeholder={key === "whatsapp" ? phonePrefix : undefined}
                value={data[key]}
                onChange={(event) => setData({ ...data, [key]: event.target.value })}
              />
            </Field>
          ))}
          {step === 0 ? <VenezuelaFields data={data} setData={setData} /> : null}
          {step === 0 ? (
            <Field label="Idiomas de la carta (códigos separados por comas)">
              <Input
                value={data.languages.join(", ")}
                onChange={(event) =>
                  setData({ ...data, languages: event.target.value.split(",").map((value) => value.trim()) })
                }
              />
            </Field>
          ) : null}
          {step === 1 ? <ScheduleEditor data={data} setData={setData} /> : null}
          {step === 2 ? (
            <>
              <Field label="Plantilla">
                <Select
                  ariaLabel="Plantilla"
                  value={data.template}
                  options={templates.map((id) => ({ id, label: id }))}
                  onValueChange={(value) => {
                    if (templates.includes(value as typeof data.template))
                      setData({ ...data, template: value as typeof data.template });
                  }}
                />
              </Field>
              <label>
                <input
                  type="checkbox"
                  checked={data.menuByEmail}
                  onChange={(event) => setData({ ...data, menuByEmail: event.target.checked })}
                />{" "}
                Enviaré la carta por correo
              </label>
            </>
          ) : null}
          {errors.length > 0 ? (
            <div role="alert">
              <p>Revisa los datos antes de enviar:</p>
              <ul>
                {errors.map((error) => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {submit.error ? <p role="alert">{submit.error.message}</p> : null}
          <div className="ming-cluster">
            {step > 0 ? (
              <Button variant="secondary" onClick={() => setStep(step - 1)}>
                Anterior
              </Button>
            ) : null}
            {step < 2 ? (
              <Button onClick={() => setStep(step + 1)}>Siguiente</Button>
            ) : (
              <Button disabled={submit.isPending} onClick={save}>
                {submit.isPending ? "Enviando…" : "Enviar datos"}
              </Button>
            )}
          </div>
        </div>
        {step === 2 ? <Preview data={data} /> : null}
      </div>
    </main>
  );
}

export function OnboardingPage() {
  const { token } = useParams({ from: "/alta/$token" });
  const query = useQuery({ ...trpc.onboarding.get.queryOptions({ token }), retry: false });
  if (query.isPending)
    return (
      <main className="ming-page">
        <p>Cargando ficha…</p>
      </main>
    );
  if (query.isError)
    return (
      <main className="ming-page">
        <h1>Enlace no disponible</h1>
        <p>{query.error.message}</p>
      </main>
    );
  return <IntakeForm token={token} initial={query.data.data ?? blank(query.data.countryCode, query.data.label)} />;
}
