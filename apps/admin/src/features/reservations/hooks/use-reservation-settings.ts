import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useFieldArray, useForm } from "react-hook-form";
import { toast } from "sonner";

import * as api from "~/features/reservations/api";
import { toSettingsFormValues, toSettingsInput, WEEKDAYS } from "~/features/reservations/services";
import { reservationSettingsFormSchema } from "~/features/reservations/types";
import { i18n } from "~/lib/i18n";
import { trpc } from "~/lib/trpc";
import { hhmmToMinutes, minutesToHHMM } from "~/shared/services/week-time";

const DEFAULT_SLOT = "20:00";
const ONE_HOUR = 60;

export function useReservationSettings(branchId: string) {
  const queryClient = useQueryClient();
  const { data } = useSuspenseQuery(api.getReservationSettingsQueryOptions({ branchId, trpc }));
  const form = useForm({
    resolver: zodResolver(reservationSettingsFormSchema),
    defaultValues: toSettingsFormValues(data),
  });
  const slots = useFieldArray({ control: form.control, name: "slots" });
  const saveMutation = useMutation(api.getReservationMutationOptions({ queryClient, trpc }).saveSettings);

  function rowsFor(weekday: number) {
    return slots.fields.flatMap((field, index) => (field.weekday === weekday ? [{ field, index }] : []));
  }

  /** A new slot starts an hour after the day's last one, so adding a dinner shift is a few taps. */
  function addSlot(weekday: number) {
    const last = form.getValues("slots").findLast((slot) => slot.weekday === weekday);
    const next = last ? Math.min(hhmmToMinutes(last.time) + ONE_HOUR, 23 * 60 + 30) : hhmmToMinutes(DEFAULT_SLOT);
    slots.append({ weekday, time: minutesToHHMM(next) });
  }

  function copyToAllDays(weekday: number) {
    const times = form
      .getValues("slots")
      .filter((slot) => slot.weekday === weekday)
      .map((slot) => slot.time);
    slots.replace(WEEKDAYS.flatMap((day) => times.map((time) => ({ weekday: day.weekday, time }))));
  }

  const save = form.handleSubmit((values) =>
    saveMutation.mutate(toSettingsInput(branchId, values), {
      onSuccess: () => {
        form.reset(values);
        toast.success(i18n.t("reservations___Ajustes guardados."));
      },
    }),
  );

  return {
    form,
    rowsFor,
    addSlot,
    removeSlot: slots.remove,
    copyToAllDays,
    save,
    saving: saveMutation.isPending,
  };
}

export type ReservationSettingsController = ReturnType<typeof useReservationSettings>;
