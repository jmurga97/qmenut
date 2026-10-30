import { Button, Checkbox, Field, Input } from "@jmurga97/components";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import * as api from "~/features/reservations/api";
import { formatLongDate, formatSlot } from "~/features/reservations/services";
import { i18n } from "~/lib/i18n";
import { trpc } from "~/lib/trpc";
import { Skeleton } from "~/shared/components/state/loading-state";
import { useSelectedBranch } from "~/shared/hooks/use-selected-branch";
import { hhmmToMinutes } from "~/shared/services/week-time";

export function ReservationsClosuresPage() {
  const branch = useSelectedBranch();
  if (!branch) return null;

  return <Closures branchId={branch.id} key={branch.id} />;
}

function Closures({ branchId }: { branchId: string }) {
  const queryClient = useQueryClient();
  const closuresQuery = useQuery(api.getReservationClosuresQueryOptions({ branchId, trpc }));
  const options = api.getReservationMutationOptions({ queryClient, trpc });
  const addMutation = useMutation(options.addClosure);
  const removeMutation = useMutation(options.removeClosure);
  const [date, setDate] = useState("");
  const [wholeDay, setWholeDay] = useState(true);
  const [time, setTime] = useState("");

  function add() {
    if (!date || (!wholeDay && !time)) return;
    addMutation.mutate(
      { branchId, date, startMinute: wholeDay ? null : hhmmToMinutes(time) },
      {
        onSuccess: () => {
          setTime("");
          toast.success(i18n.t("reservations___Cierre añadido."));
        },
      },
    );
  }

  return (
    <div className={"reservations-closures"}>
      <form
        aria-labelledby={"reservations-close-title"}
        className={"admin-card"}
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          add();
        }}
      >
        <h2 id={"reservations-close-title"}>{i18n.t("reservations___Cerrar reservas")}</h2>
        <p className={"admin-copy"}>
          {i18n.t(
            "reservations___Para festivos, eventos privados o reservas tomadas por teléfono. Las reservas que ya existen no se cancelan.",
          )}
        </p>
        <Field label={i18n.t("reservations___Fecha")}>
          <Input onValueChange={setDate} required type={"date"} value={date} />
        </Field>
        <Checkbox
          checked={wholeDay}
          label={i18n.t("reservations___Todo el día")}
          onCheckedChange={(checked) => setWholeDay(checked)}
        />
        {wholeDay ? null : (
          <Field label={i18n.t("reservations___Hora")}>
            <Input onValueChange={setTime} required type={"time"} value={time} />
          </Field>
        )}
        <Button disabled={addMutation.isPending || !date || (!wholeDay && !time)} type={"submit"} variant={"primary"}>
          {wholeDay ? i18n.t("reservations___Cerrar el día") : i18n.t("reservations___Cerrar la hora")}
        </Button>
      </form>
      <section aria-labelledby={"reservations-closures-title"} className={"admin-card"}>
        <h2 id={"reservations-closures-title"}>{i18n.t("reservations___Próximos cierres")}</h2>
        {closuresQuery.isPending ? <Skeleton height={"2.5rem"} /> : null}
        {closuresQuery.isError ? (
          <Button onClick={() => void closuresQuery.refetch()} variant={"secondary"}>
            {i18n.t("reservations___Reintentar")}
          </Button>
        ) : null}
        {closuresQuery.data?.length === 0 ? (
          <p className={"admin-copy"}>{i18n.t("reservations___No hay cierres programados.")}</p>
        ) : null}
        <ul className={"reservations-list"}>
          {closuresQuery.data?.map((closure) => {
            const label = `${formatLongDate(closure.date)} · ${
              closure.startMinute === null ? i18n.t("reservations___todo el día") : formatSlot(closure.startMinute)
            }`;

            return (
              <li className={"reservations-row reservations-closure"} key={closure.id}>
                <span>{label}</span>
                <Button
                  aria-label={i18n.t("reservations___Reabrir {{closure}}", { closure: label })}
                  disabled={removeMutation.isPending}
                  onClick={() => removeMutation.mutate({ branchId, closureId: closure.id })}
                  size={"sm"}
                  variant={"ghost"}
                >
                  {i18n.t("reservations___Reabrir")}
                </Button>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
