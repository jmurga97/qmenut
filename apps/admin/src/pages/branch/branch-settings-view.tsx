import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { FormProvider, useForm } from "react-hook-form";
import { useState } from "react";
import { z } from "zod";

import { FormTextInput } from "@components/forms/adapters/form-text-input";
import { getErrorMessage } from "@lib/errors";
import { trpc } from "@lib/trpc";
import { useSelectedBranch } from "@lib/use-selected-branch";

const DAYS = [
  { value: 1, label: "Lunes" },
  { value: 2, label: "Martes" },
  { value: 3, label: "Miércoles" },
  { value: 4, label: "Jueves" },
  { value: 5, label: "Viernes" },
  { value: 6, label: "Sábado" },
  { value: 7, label: "Domingo" },
] as const;

const formSchema = z.object({
  name: z.string().trim().min(1, { message: "El nombre es obligatorio" }),
  address: z.string().trim(),
  phone: z.string().trim(),
  whatsapp: z.string().trim(),
});

type BranchFormValues = z.infer<typeof formSchema>;

interface DaySchedule {
  enabled: boolean;
  open: string;
  close: string;
}

function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60)
    .toString()
    .padStart(2, "0");
  const m = (minutes % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}

function timeToMinutes(time: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(time);
  if (!match) {
    return null;
  }
  const minutes = Number(match[1]) * 60 + Number(match[2]);
  return minutes >= 0 && minutes <= 1439 ? minutes : null;
}

export function BranchSettingsView() {
  const branch = useSelectedBranch();

  if (!branch) {
    return (
      <div className="admin-page">
        <p className="admin-copy">No hay ninguna sucursal disponible.</p>
      </div>
    );
  }

  return <BranchSettingsForm branchId={branch.id} key={branch.id} />;
}

function BranchSettingsForm({ branchId }: { branchId: string }) {
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const { data: settings } = useSuspenseQuery(trpc.admin.branches.get.queryOptions({ branchId }));

  const form = useForm<BranchFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: settings.name,
      address: settings.address ?? "",
      phone: settings.phone ?? "",
      whatsapp: settings.whatsapp ?? "",
    },
  });

  const [schedule, setSchedule] = useState<Record<number, DaySchedule>>(() => {
    const initial: Record<number, DaySchedule> = {};
    for (const day of DAYS) {
      const existing = settings.schedules.find((row) => row.dayOfWeek === day.value);
      initial[day.value] = existing
        ? { enabled: true, open: minutesToTime(existing.openMinute), close: minutesToTime(existing.closeMinute) }
        : { enabled: false, open: "12:00", close: "23:00" };
    }
    return initial;
  });

  const saveMutation = useMutation(trpc.admin.branches.save.mutationOptions());

  function updateDay(day: number, patch: Partial<DaySchedule>) {
    setSchedule((current) => ({ ...current, [day]: { ...current[day], ...patch } }));
  }

  async function handleSubmit(values: BranchFormValues) {
    setServerError(null);
    setSaved(false);

    const schedules: { dayOfWeek: number; openMinute: number; closeMinute: number }[] = [];
    for (const day of DAYS) {
      const entry = schedule[day.value];
      if (!entry.enabled) {
        continue;
      }
      const openMinute = timeToMinutes(entry.open);
      const closeMinute = timeToMinutes(entry.close);
      if (openMinute === null || closeMinute === null || closeMinute < openMinute) {
        setServerError(`Horario no válido para ${day.label}.`);
        return;
      }
      schedules.push({ dayOfWeek: day.value, openMinute, closeMinute });
    }

    try {
      await saveMutation.mutateAsync({
        branchId,
        info: {
          name: values.name,
          address: values.address || undefined,
          phone: values.phone || undefined,
          whatsapp: values.whatsapp || undefined,
        },
        schedules,
        photos: settings.photos,
      });
      await queryClient.invalidateQueries({ queryKey: trpc.admin.branches.get.queryKey({ branchId }) });
      await queryClient.invalidateQueries({ queryKey: trpc.admin.tenant.me.queryKey() });
      setSaved(true);
    } catch (error) {
      setServerError(getErrorMessage(error));
    }
  }

  return (
    <div className="admin-page">
      <header className="admin-page-header">
        <div className="admin-kicker">Sucursal</div>
        <h2>{settings.name}</h2>
        <p>Datos de contacto y horario que verán tus clientes en la carta pública.</p>
      </header>

      <FormProvider {...form}>
        <div className="admin-editor-shell">
          <div className="admin-form-grid">
            <FormTextInput<BranchFormValues> label="Nombre" name="name" required />
            <FormTextInput<BranchFormValues> label="Dirección" name="address" optional />
            <FormTextInput<BranchFormValues> label="Teléfono" name="phone" optional />
            <FormTextInput<BranchFormValues> label="WhatsApp" name="whatsapp" optional />
          </div>

          <section className="admin-editor-section">
            <div className="admin-kicker">Horario semanal</div>
            <div className="admin-schedule-grid">
              {DAYS.map((day) => {
                const entry = schedule[day.value];
                return (
                  <div className="admin-schedule-row" key={day.value}>
                    <label className="admin-checkbox">
                      <input
                        checked={entry.enabled}
                        onChange={(event) => updateDay(day.value, { enabled: event.currentTarget.checked })}
                        type="checkbox"
                      />
                      <span>{day.label}</span>
                    </label>
                    <input
                      aria-label={`Apertura ${day.label}`}
                      disabled={!entry.enabled}
                      onChange={(event) => updateDay(day.value, { open: event.currentTarget.value })}
                      type="time"
                      value={entry.open}
                    />
                    <input
                      aria-label={`Cierre ${day.label}`}
                      disabled={!entry.enabled}
                      onChange={(event) => updateDay(day.value, { close: event.currentTarget.value })}
                      type="time"
                      value={entry.close}
                    />
                  </div>
                );
              })}
            </div>
          </section>

          {serverError ? <mc-inline-message message={serverError} tone="error" /> : null}
          {saved ? <mc-inline-message message="Cambios guardados." tone="success" /> : null}

          <div className="admin-topbar-actions">
            <mc-button
              disabled={saveMutation.isPending}
              onClick={() => void form.handleSubmit(handleSubmit)()}
              variant="primary"
            >
              {saveMutation.isPending ? "Guardando…" : "Guardar"}
            </mc-button>
          </div>
        </div>
      </FormProvider>
    </div>
  );
}
