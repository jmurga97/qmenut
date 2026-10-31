import { Badge, Button, ConfirmAction, Input } from "@jmurga97/components";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useState } from "react";

import { useReservationDay } from "~/features/reservations/hooks/use-reservation-day";
import {
  formatLongDate,
  formatSlot,
  groupBySlot,
  holdsTable,
  shiftDate,
  STATUS_LABELS,
  STATUS_TONES,
} from "~/features/reservations/services";
import { i18n } from "~/lib/i18n";
import { Skeleton } from "~/shared/components/state/loading-state";
import { useSelectedBranch } from "~/shared/hooks/use-selected-branch";

import type { ReservationDayState } from "~/features/reservations/hooks/use-reservation-day";
import type { SlotGroup } from "~/features/reservations/services";
import type { StaffReservation } from "~/features/reservations/types";

function formatPeople(count: number): string {
  return count === 1 ? i18n.t("reservations___1 persona") : i18n.t("reservations___{{count}} personas", { count });
}

function formatHeld(count: number): string {
  return count === 1 ? i18n.t("reservations___1 reserva") : i18n.t("reservations___{{count}} reservas", { count });
}

export function ReservationsDayPage() {
  const branch = useSelectedBranch();
  if (!branch) return null;

  return <ReservationsDay branchId={branch.id} key={branch.id} />;
}

function ReservationsDay({ branchId }: { branchId: string }) {
  const { date } = useSearch({ from: "/_auth/reservations/" });
  const navigate = useNavigate();
  const day = useReservationDay({ branchId, date });
  const data = day.dayQuery.data;
  const goTo = (nextDate: string) => void navigate({ to: "/reservations", search: { date: nextDate } });

  return (
    <section className={"admin-card reservations-day"} aria-labelledby={"reservations-day-title"}>
      <div className={"admin-toolbar reservations-day-toolbar"}>
        <h2 id={"reservations-day-title"}>{data ? formatLongDate(data.date) : i18n.t("reservations___Reservas")}</h2>
        {data ? (
          <div className={"reservations-day-nav"}>
            <Button onClick={() => goTo(shiftDate(data.date, -1))} size={"sm"} variant={"secondary"}>
              {i18n.t("reservations___Día anterior")}
            </Button>
            <Input
              aria-label={i18n.t("reservations___Fecha")}
              onValueChange={(value) => value && goTo(value)}
              type={"date"}
              value={data.date}
            />
            <Button onClick={() => goTo(shiftDate(data.date, 1))} size={"sm"} variant={"secondary"}>
              {i18n.t("reservations___Día siguiente")}
            </Button>
            {data.date === data.today ? null : (
              <Button onClick={() => goTo(data.today)} size={"sm"} variant={"ghost"}>
                {i18n.t("reservations___Hoy")}
              </Button>
            )}
          </div>
        ) : null}
      </div>
      <DayContent day={day} />
      <ConfirmDialog day={day} />
    </section>
  );
}

function DayContent({ day }: { day: ReservationDayState }) {
  const { dayQuery } = day;
  if (dayQuery.isPending) {
    return (
      <div aria-busy={"true"} aria-label={i18n.t("reservations___Cargando reservas")} className={"reservations-slots"}>
        <Skeleton width={"30%"} />
        <Skeleton height={"3rem"} />
        <Skeleton height={"3rem"} />
      </div>
    );
  }
  if (dayQuery.isError) {
    return (
      <Button onClick={() => void dayQuery.refetch()} variant={"secondary"}>
        {i18n.t("reservations___Reintentar")}
      </Button>
    );
  }

  const groups = groupBySlot(dayQuery.data.reservations);
  if (groups.length === 0) return <p className={"admin-copy"}>{i18n.t("reservations___No hay reservas este día.")}</p>;

  return (
    <div className={"reservations-slots"} aria-busy={dayQuery.isFetching}>
      {groups.map((group) => (
        <SlotSection capacity={dayQuery.data.slotCapacity} day={day} group={group} key={group.minute} />
      ))}
    </div>
  );
}

function SlotSection({
  capacity,
  day,
  group,
}: {
  capacity: number | null;
  day: ReservationDayState;
  group: SlotGroup;
}) {
  const headingId = `reservations-slot-${group.minute}`;

  return (
    <section aria-labelledby={headingId} className={"reservations-slot"}>
      <h3 id={headingId}>
        {formatSlot(group.minute)}
        <span>
          {capacity === null
            ? formatHeld(group.held)
            : i18n.t("reservations___{{held}} de {{capacity}} reservas", { held: group.held, capacity })}
          {` · ${formatPeople(group.people)}`}
        </span>
      </h3>
      <ul className={"reservations-list"}>
        {group.reservations.map((reservation) => (
          <ReservationRow day={day} key={reservation.id} reservation={reservation} />
        ))}
      </ul>
    </section>
  );
}

function ReservationRow({ day, reservation }: { day: ReservationDayState; reservation: StaffReservation }) {
  const [open, setOpen] = useState(false);
  const detailsId = `reservation-details-${reservation.id}`;
  const name = reservation.guestName ?? i18n.t("reservations___Cliente anónimo");

  return (
    <li className={"reservations-row"} data-status={reservation.status}>
      <div className={"reservations-row-main"}>
        <button
          aria-controls={detailsId}
          aria-expanded={open}
          className={"reservations-row-toggle"}
          onClick={() => setOpen(!open)}
          type={"button"}
        >
          <strong>{name}</strong>
          <span>{formatPeople(reservation.partySize)}</span>
        </button>
        <Badge tone={STATUS_TONES[reservation.status]}>{STATUS_LABELS[reservation.status]}</Badge>
      </div>
      {open ? (
        <dl className={"reservations-row-details"} id={detailsId}>
          <div>
            <dt>{i18n.t("reservations___Teléfono")}</dt>
            <dd>
              {reservation.guestPhone ? <a href={`tel:${reservation.guestPhone}`}>{reservation.guestPhone}</a> : "—"}
            </dd>
          </div>
          <div>
            <dt>{i18n.t("reservations___Email")}</dt>
            <dd>
              {reservation.guestEmail ? <a href={`mailto:${reservation.guestEmail}`}>{reservation.guestEmail}</a> : "—"}
            </dd>
          </div>
        </dl>
      ) : null}
      <RowActions day={day} name={name} reservation={reservation} />
    </li>
  );
}

function RowActions({
  day,
  name,
  reservation,
}: {
  day: ReservationDayState;
  name: string;
  reservation: StaffReservation;
}) {
  if (!holdsTable(reservation.status)) return null;

  return (
    <div className={"reservations-row-actions"}>
      <Button
        aria-label={i18n.t("reservations___Cancelar la reserva de {{name}}", { name })}
        disabled={day.actionBusy}
        onClick={() => day.askToConfirm(reservation)}
        size={"sm"}
        variant={"ghost"}
      >
        {i18n.t("reservations___Cancelar reserva")}
      </Button>
    </div>
  );
}

function ConfirmDialog({ day }: { day: ReservationDayState }) {
  const reservation = day.confirmation;
  if (!reservation) return null;
  const name = reservation.guestName ?? i18n.t("reservations___Cliente anónimo");
  const when = `${formatLongDate(reservation.slotDate)} · ${formatSlot(reservation.slotMinute)}`;

  return (
    <ConfirmAction
      cancelLabel={i18n.t("reservations___Volver")}
      confirmLabel={i18n.t("reservations___Cancelar reserva")}
      message={i18n.t(
        "reservations___La reserva de {{name}} para el {{when}} se cancela, la mesa queda libre y el cliente recibe un email. No se puede deshacer.",
        { name, when },
      )}
      onCancel={day.closeConfirmation}
      onConfirm={day.confirm}
      onOpenChange={(open) => {
        if (!open) day.closeConfirmation();
      }}
      open
      pending={day.actionBusy}
      title={i18n.t("reservations___¿Cancelar esta reserva?")}
    />
  );
}
