import { Button, ConfirmAction, Field, Input, ResourceTable, Textarea } from "@jmurga97/components";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { trpc } from "~/lib/trpc";
import { formText } from "~/shared/form";
import { count, date } from "~/shared/format";
import { PageHeader } from "~/shared/page";

import type { ResourceTableColumn } from "@jmurga97/components";
import type { LabOutputs } from "~/lib/trpc";

type Announcement = LabOutputs["announcements"]["list"][number];

const columns: ResourceTableColumn<Announcement>[] = [
  {
    id: "text",
    header: "Aviso",
    render: (row) => (
      <div className="lab-identity">
        <strong>{row.title}</strong>
        <span>{row.body}</span>
      </div>
    ),
    width: "50%",
  },
  { id: "restaurants", header: "Restaurantes", align: "end", render: (row) => count(row.restaurants) },
  { id: "read", header: "Leído", align: "end", render: (row) => `${count(row.read)}/${count(row.recipients)}` },
  { id: "sent", header: "Publicado", align: "end", render: (row) => date(row.createdAt) },
];

export function AnnouncementsPage() {
  const queryClient = useQueryClient();
  const announcements = useQuery(trpc.lab.announcements.list.queryOptions());
  const [draft, setDraft] = useState<{ title: string; body: string } | null>(null);
  // Bumped after publishing to remount the form empty.
  const [formKey, setFormKey] = useState(0);
  const publish = useMutation(
    trpc.lab.announcements.publish.mutationOptions({
      onSuccess: async () => {
        setDraft(null);
        setFormKey((key) => key + 1);
        toast.success("Aviso publicado.");
        await queryClient.invalidateQueries({ queryKey: trpc.lab.announcements.pathKey() });
      },
    }),
  );

  return (
    <>
      <PageHeader title="Avisos" />
      <form
        className="lab-form"
        key={formKey}
        onSubmit={(event) => {
          event.preventDefault();
          const form = event.currentTarget;
          setDraft({ title: formText(form, "title"), body: formText(form, "body") });
        }}
      >
        <Field label="Título">
          <Input maxLength={80} minLength={2} name="title" required />
        </Field>
        <Field label="Mensaje">
          <Textarea maxLength={500} minLength={2} name="body" required rows={4} />
        </Field>
        <div>
          <Button type="submit">Publicar</Button>
        </div>
      </form>
      <section aria-labelledby="sent-title" className="ming-section">
        <h2 className="ming-section__title" id="sent-title">
          Publicados
        </h2>
        <ResourceTable
          ariaLabel="Avisos publicados"
          columns={columns}
          emptyState="Sin avisos."
          error={announcements.error ? "No se pudieron cargar los avisos." : undefined}
          getRowId={(row) => row.id}
          loading={announcements.isPending}
          loadingLabel="Cargando avisos…"
          refetching={announcements.isRefetching}
          responsive="stacked"
          rows={announcements.data ?? []}
        />
      </section>
      <ConfirmAction
        cancelLabel="Cancelar"
        confirmLabel="Publicar"
        message="Llegará a la bandeja de todas las sucursales. No se puede deshacer."
        onConfirm={() => draft && publish.mutate(draft)}
        onOpenChange={(open) => {
          if (!open) setDraft(null);
        }}
        open={draft !== null}
        pending={publish.isPending}
        pendingLabel="Publicando…"
        title={draft?.title ?? ""}
      />
    </>
  );
}
