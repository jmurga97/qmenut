import { Button, ConfirmAction, Field, Input, Select } from "@jmurga97/components";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { trpc } from "~/lib/trpc";
import { PageHeader, PageState } from "~/shared/page";

import type { LabOutputs } from "~/lib/trpc";

type OnboardingIntake = NonNullable<LabOutputs["intakes"]["get"]["data"]>;

async function copy(url: string) {
  try {
    await navigator.clipboard.writeText(`Hola, rellena tus datos para QMenut: ${url}`);
    toast.success("Texto y enlace copiados.");
  } catch {
    toast.error("No se pudo copiar el enlace.");
  }
}

const STATUS = { pending: "Pendiente", submitted: "Enviada", used: "Dada de alta" } as const;
function IntakeAnswer({ data }: { data: OnboardingIntake }) {
  const rows = [
    ["Restaurante", data.restaurantName],
    ["Web", `${data.subdomain}.qmenut.app`],
    ["Dirección", data.address],
    ["Teléfono", data.phone],
    ["WhatsApp", data.whatsapp],
    ["Instagram", data.instagram],
    ["Propietario", data.ownerName],
    ["Correo del propietario", data.ownerEmail],
    ["Razón social", data.legalName],
    [data.countryCode === "ESP" ? "NIF / CIF" : "RIF", data.taxId],
    ["Dirección fiscal", data.legalAddress],
    ["Correo de privacidad", data.countryCode === "ESP" ? data.privacyEmail : "El del propietario"],
    ["Carta", data.menuUrl || "Pedirla por WhatsApp"],
    ["Notas", data.notes],
  ];
  return (
    <>
      <h3>Respuesta</h3>
      <dl>
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value || "—"}</dd>
          </div>
        ))}
      </dl>
    </>
  );
}

export function IntakesPage() {
  const client = useQueryClient();
  const list = useQuery(trpc.lab.intakes.list.queryOptions());
  const [countryCode, setCountryCode] = useState<"ESP" | "VEN">("ESP");
  const [label, setLabel] = useState("");
  const [email, setEmail] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [planCode, setPlanCode] = useState<"basic" | "business">("basic");
  const detail = useQuery({
    ...trpc.lab.intakes.get.queryOptions({ token: selected ?? "" }),
    enabled: selected !== null,
  });
  const refresh = () => client.invalidateQueries({ queryKey: trpc.lab.intakes.pathKey() });
  const create = useMutation(
    trpc.lab.intakes.create.mutationOptions({
      onSuccess: async (result) => {
        setLabel("");
        setEmail("");
        setSelected(result.token);
        await refresh();
        toast.success("Enlace creado.");
      },
      onError: (error) => toast.error(error.message),
    }),
  );
  const send = useMutation(
    trpc.lab.intakes.send.mutationOptions({
      onSuccess: async () => {
        await refresh();
        toast.success("Correo enviado.");
      },
      onError: (error) => toast.error(error.message),
    }),
  );
  const mark = useMutation(
    trpc.lab.intakes.markUsed.mutationOptions({
      onSuccess: async () => {
        setConfirming(false);
        await refresh();
        toast.success("Ficha marcada como dada de alta.");
      },
      onError: (error) => toast.error(error.message),
    }),
  );
  function download() {
    if (!detail.data?.tenantFile) return;
    const tenantFile = { ...detail.data.tenantFile, branch: { ...detail.data.tenantFile.branch, planCode } };
    const link = document.createElement("a");
    link.href = URL.createObjectURL(
      new Blob([JSON.stringify(tenantFile, null, 2) + "\n"], { type: "application/json" }),
    );
    link.download = "tenant.json";
    link.click();
    URL.revokeObjectURL(link.href);
  }
  return (
    <>
      <PageHeader title="Altas" />
      <p>Crea una ficha, compártela y descarga los datos para publicar el restaurante.</p>
      <section className="ming-section">
        <h2>Crear enlace</h2>
        <form
          className="ming-stack"
          onSubmit={(event) => {
            event.preventDefault();
            create.mutate({ label, contactEmail: email, countryCode });
          }}
        >
          <Field label="Restaurante">
            <Input value={label} required maxLength={80} onChange={(event) => setLabel(event.target.value)} />
          </Field>
          <Field label="Correo de contacto">
            <Input type="email" value={email} required onChange={(event) => setEmail(event.target.value)} />
          </Field>
          <Field label="País">
            <Select
              ariaLabel="País"
              value={countryCode}
              options={[
                { id: "ESP", label: "España" },
                { id: "VEN", label: "Venezuela" },
              ]}
              onValueChange={(value) => setCountryCode(value === "VEN" ? "VEN" : "ESP")}
            />
          </Field>
          <Button type="submit" disabled={create.isPending}>
            Crear enlace
          </Button>
        </form>
      </section>
      <section className="ming-section">
        <h2>Fichas</h2>
        {list.isPending || list.isError ? (
          <PageState error={list.error} onRetry={() => void list.refetch()} />
        ) : (
          <>
            {list.data.length === 0 ? <p>No hay fichas todavía.</p> : null}
            <ul>
              {list.data.map((row) => (
                <li key={row.id}>
                  <Button variant="ghost" onClick={() => setSelected(row.id)}>
                    {row.label} · {row.countryCode} · {STATUS[row.status]}
                  </Button>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
      {selected ? (
        <section className="ming-section">
          <h2>Ficha</h2>
          {detail.isPending || detail.isError ? (
            <PageState error={detail.error} onRetry={() => void detail.refetch()} />
          ) : (
            <>
              <p>
                {detail.data.label} · {detail.data.countryCode} · {STATUS[detail.data.status]}
              </p>
              <p>Contacto: {detail.data.contactEmail}</p>
              <p>Caduca: {new Date(detail.data.expiresAt).toLocaleDateString("es")}</p>
              <div className="ming-cluster">
                <Button variant="secondary" onClick={() => void copy(detail.data.url)}>
                  Copiar enlace
                </Button>
                <Button
                  variant="secondary"
                  disabled={send.isPending || detail.data.status === "used"}
                  onClick={() => send.mutate({ token: selected })}
                >
                  Enviar por correo
                </Button>
                {detail.data.tenantFile ? (
                  <>
                    <Select
                      ariaLabel="Plan"
                      value={planCode}
                      options={[
                        { id: "basic", label: "Basic" },
                        { id: "business", label: "Business" },
                      ]}
                      onValueChange={(value) => setPlanCode(value === "business" ? "business" : "basic")}
                    />
                    <Button variant="secondary" onClick={download}>
                      Descargar tenant.json
                    </Button>
                  </>
                ) : null}
                {detail.data.status === "submitted" ? (
                  <Button variant="secondary" onClick={() => setConfirming(true)}>
                    Marcar como dado de alta
                  </Button>
                ) : null}
              </div>
              {detail.data.data ? <IntakeAnswer data={detail.data.data} /> : <p>Aún no se ha enviado la ficha.</p>}
            </>
          )}
        </section>
      ) : null}
      <ConfirmAction
        open={confirming}
        onOpenChange={setConfirming}
        title="Marcar como dado de alta"
        message="El restaurante ya no podrá cambiar esta ficha."
        confirmLabel="Marcar como dado de alta"
        cancelLabel="Cancelar"
        pending={mark.isPending}
        onConfirm={() => {
          if (selected) mark.mutate({ token: selected });
        }}
      />
    </>
  );
}
