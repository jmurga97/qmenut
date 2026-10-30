import { QmCalendar } from "@qmenut/ui/components/qm-calendar/react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useRouteContext } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { useBookingFlow } from "~/features/reservations/hooks/use-booking-flow";
import { useGuestReservations } from "~/features/reservations/hooks/use-guest-reservations";
import {
  formatSlotDate,
  formatSlotTime,
  getDefaultPhonePrefix,
  toE164,
} from "~/features/reservations/reservation-format";
import { useAppTrpc } from "~/shared/hooks/use-app-trpc";
import { useTenantContext } from "~/shared/hooks/use-tenant-context";
import { getPublicMenuQueryOptions } from "~/shared/public-menu/public-menu-query-options";

import type { BookingFlow, ContactField } from "~/features/reservations/hooks/use-booking-flow";
import type { GuestReservations } from "~/features/reservations/hooks/use-guest-reservations";

function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function ReservationExperience() {
  const trpc = useAppTrpc();
  const { host } = useTenantContext();
  const { locale, effectiveLocale } = useRouteContext({ from: "/{-$locale}" });
  const { data: menu } = useSuspenseQuery(getPublicMenuQueryOptions({ host, locale, trpc }));
  const guest = useGuestReservations({ host, trpc });
  return (
    <div className="reservations-stack">
      {menu?.publicFeatures.reservations ? (
        <BookingExperience guest={guest} countryCode={menu.countryCode} />
      ) : (
        <UnavailableState />
      )}
      <GuestReservationsSection guest={guest} locale={effectiveLocale} />
    </div>
  );
}

function BookingExperience({ guest, countryCode }: { guest: GuestReservations; countryCode: string }) {
  const trpc = useAppTrpc();
  const { host } = useTenantContext();
  const { locale, effectiveLocale } = useRouteContext({ from: "/{-$locale}" });
  const booking = useBookingFlow({
    host,
    trpc,
    language: effectiveLocale,
    initialMonth: currentMonth(),
    defaultPrefix: getDefaultPhonePrefix(countryCode),
    rememberedEmail: guest.email,
    onSent: guest.remember,
  });

  return (
    <BookingSection
      booking={booking}
      locale={effectiveLocale}
      privacyHref={locale ? `/${locale}/privacidad` : "/privacidad"}
    />
  );
}

function UnavailableState() {
  const { t } = useTranslation();

  return (
    <section className="reservations-card" aria-labelledby="reservations-unavailable-title">
      <h2 id="reservations-unavailable-title">{t("reservations.unavailable.title")}</h2>
      <p className="reservations-muted">{t("reservations.unavailable.body")}</p>
    </section>
  );
}

interface BookingSectionProps {
  booking: BookingFlow;
  locale: string;
  privacyHref: string;
}

function BookingSection({ booking, locale, privacyHref }: BookingSectionProps) {
  const opened = useRef(false);

  // Each step replaces the last: move focus to its heading so keyboard and screen reader users follow along.
  useEffect(() => {
    if (opened.current) document.querySelector<HTMLElement>(`#reservations-${booking.step}-title`)?.focus();
    opened.current = true;
  }, [booking.step]);

  switch (booking.step) {
    case "slot":
      return <SlotStep booking={booking} locale={locale} />;
    case "party":
      return <PartyStep booking={booking} locale={locale} />;
    case "contact":
      return <ContactStep booking={booking} />;
    case "review":
      return <ReviewStep booking={booking} locale={locale} privacyHref={privacyHref} />;
    case "sent":
      return <SentStep booking={booking} />;
  }
}

function StepError({ booking }: { booking: BookingFlow }) {
  const { t } = useTranslation();
  if (!booking.error) return null;

  return (
    <p className="reservations-error" role="alert">
      {t(`reservations.errors.${booking.error}`)}
    </p>
  );
}

function SlotStep({ booking, locale }: { booking: BookingFlow; locale: string }) {
  const { t } = useTranslation();
  const data = booking.availability.data;
  const day = data?.days.find((candidate) => candidate.date === booking.date);

  return (
    <section className="reservations-card" aria-labelledby="reservations-slot-title">
      <h2 id="reservations-slot-title" tabIndex={-1}>
        {t("reservations.slot.title")}
      </h2>
      <StepError booking={booking} />
      <QmCalendar
        month={booking.month}
        days={data?.days ?? []}
        selected={booking.date ?? ""}
        locale={locale}
        minMonth={data?.today.slice(0, 7) ?? ""}
        maxMonth={data?.lastDate.slice(0, 7) ?? ""}
        previousLabel={t("reservations.calendar.previous")}
        nextLabel={t("reservations.calendar.next")}
        availableLabel={t("reservations.calendar.available")}
        fullLabel={t("reservations.calendar.full")}
        unavailableLabel={t("reservations.calendar.unavailable")}
        onQmMonth={(event) => booking.setMonth(event.detail.month)}
        onQmSelect={(event) => booking.pickDate(event.detail.date)}
      />
      {booking.availability.isError ? (
        <p className="reservations-error" role="alert">
          {t("reservations.errors.load")}
        </p>
      ) : null}
      {day ? (
        <div className="reservations-group" role="group" aria-label={formatSlotDate(day.date, locale)}>
          <p className="reservations-label">{formatSlotDate(day.date, locale)}</p>
          <div className="reservations-options">
            {day.slots.map((slot) => (
              <button
                key={slot.minute}
                type="button"
                className="reservations-option"
                disabled={slot.freeTables === 0}
                aria-label={
                  slot.freeTables === 0
                    ? `${formatSlotTime(slot.minute, locale)}, ${t("reservations.slot.full")}`
                    : undefined
                }
                onClick={() => booking.pickSlot(slot.minute)}
              >
                {formatSlotTime(slot.minute, locale)}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <p className="reservations-muted">{t("reservations.slot.pickDay")}</p>
      )}
    </section>
  );
}

function StepHeader({ booking, title, locale }: { booking: BookingFlow; title: string; locale?: string }) {
  const { t } = useTranslation();

  return (
    <>
      <button type="button" className="reservations-back" onClick={booking.back}>
        {t("reservations.back")}
      </button>
      <h2 id={`reservations-${booking.step}-title`} tabIndex={-1}>
        {title}
      </h2>
      {locale && booking.date && booking.minute !== null ? (
        <p className="reservations-muted reservations-when">
          {formatSlotDate(booking.date, locale)} · {formatSlotTime(booking.minute, locale)}
        </p>
      ) : null}
    </>
  );
}

function PartyStep({ booking, locale }: { booking: BookingFlow; locale: string }) {
  const { t } = useTranslation();
  const data = booking.availability.data;
  const limit = data?.onlinePartyLimit ?? 1;
  const phone = data?.phone ? toE164({ prefix: "", number: data.phone }) : null;

  return (
    <section className="reservations-card" aria-labelledby="reservations-party-title">
      <StepHeader booking={booking} title={t("reservations.party.title")} locale={locale} />
      <div className="reservations-options" role="group" aria-labelledby="reservations-party-title">
        {Array.from({ length: limit }, (_, index) => index + 1).map((size) => (
          <button
            key={size}
            type="button"
            className="reservations-option"
            aria-pressed={booking.partySize === size}
            aria-label={t("reservations.party.people", { count: size })}
            onClick={() => booking.pickParty(size)}
          >
            {size}
          </button>
        ))}
      </div>
      <p className="reservations-muted">
        {data?.phone ? (
          <>
            {t("reservations.party.larger")} <a href={phone ? `tel:${phone}` : undefined}>{data.phone}</a>
          </>
        ) : (
          t("reservations.party.largerNoPhone")
        )}
      </p>
    </section>
  );
}

interface TextFieldProps {
  booking: BookingFlow;
  field: ContactField;
  type: "text" | "tel" | "email";
  autoComplete: string;
  label?: string;
}

function TextField({ booking, field, type, autoComplete, label }: TextFieldProps) {
  const invalid = booking.invalid.includes(field);

  return (
    <input
      id={`reservations-${field}`}
      type={type}
      inputMode={type === "text" ? undefined : type}
      autoComplete={autoComplete}
      value={booking.contact[field]}
      aria-label={label}
      aria-invalid={invalid || undefined}
      aria-describedby={invalid ? `reservations-${field}-error` : undefined}
      onChange={(event) => booking.setField(field, event.target.value)}
    />
  );
}

function FieldError({ booking, field }: { booking: BookingFlow; field: ContactField }) {
  const { t } = useTranslation();
  if (!booking.invalid.includes(field)) return null;

  return (
    <span id={`reservations-${field}-error`} className="reservations-error">
      {t(`reservations.contact.invalid.${field}`)}
    </span>
  );
}

function ContactStep({ booking }: { booking: BookingFlow }) {
  const { t } = useTranslation();

  return (
    <section className="reservations-card" aria-labelledby="reservations-contact-title">
      <StepHeader booking={booking} title={t("reservations.contact.title")} />
      <form
        className="reservations-form"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          booking.checkContact();
        }}
      >
        <div className="reservations-field">
          <label htmlFor="reservations-name">{t("reservations.contact.name")}</label>
          <TextField booking={booking} field="name" type="text" autoComplete="name" />
          <FieldError booking={booking} field="name" />
        </div>
        <div className="reservations-field">
          <label htmlFor="reservations-phone">{t("reservations.contact.phone")}</label>
          <div className="reservations-phone">
            <TextField
              booking={booking}
              field="prefix"
              type="tel"
              autoComplete="tel-country-code"
              label={t("reservations.contact.prefix")}
            />
            <TextField booking={booking} field="phone" type="tel" autoComplete="tel-national" />
          </div>
          <FieldError booking={booking} field="phone" />
        </div>
        <div className="reservations-field">
          <label htmlFor="reservations-email">{t("reservations.contact.email")}</label>
          <TextField booking={booking} field="email" type="email" autoComplete="email" />
          <FieldError booking={booking} field="email" />
        </div>
        <button type="submit" className="reservations-primary">
          {t("reservations.contact.continue")}
        </button>
      </form>
    </section>
  );
}

interface ReviewStepProps {
  booking: BookingFlow;
  locale: string;
  privacyHref: string;
}

function ReviewStep({ booking, locale, privacyHref }: ReviewStepProps) {
  const { t } = useTranslation();
  const phone = toE164({ prefix: booking.contact.prefix, number: booking.contact.phone }) ?? "";
  const rows = [
    [t("reservations.review.date"), booking.date ? formatSlotDate(booking.date, locale) : ""],
    [t("reservations.review.time"), booking.minute === null ? "" : formatSlotTime(booking.minute, locale)],
    [t("reservations.review.party"), t("reservations.party.people", { count: booking.partySize ?? 0 })],
    [t("reservations.contact.name"), booking.contact.name.trim()],
    [t("reservations.contact.phone"), phone],
    [t("reservations.contact.email"), booking.contact.email.trim().toLowerCase()],
  ];

  return (
    <section className="reservations-card" aria-labelledby="reservations-review-title">
      <StepHeader booking={booking} title={t("reservations.review.title")} />
      <dl className="reservations-summary">
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      <div className="reservations-consent">
        <input
          id="reservations-consent"
          type="checkbox"
          checked={booking.consent}
          aria-describedby={booking.error === "consent" ? "reservations-review-error" : undefined}
          onChange={(event) => booking.setConsent(event.target.checked)}
        />
        <label htmlFor="reservations-consent">
          {t("reservations.review.consent")} <a href={privacyHref}>{t("reservations.review.privacyLink")}</a>
        </label>
      </div>
      <div id="reservations-review-error">
        <StepError booking={booking} />
      </div>
      <button
        type="button"
        className="reservations-primary"
        disabled={booking.sending}
        onClick={() => void booking.submit()}
      >
        {t(booking.sending ? "reservations.review.sending" : "reservations.review.submit")}
      </button>
    </section>
  );
}

function SentStep({ booking }: { booking: BookingFlow }) {
  const { t } = useTranslation();

  return (
    <section className="reservations-card" aria-labelledby="reservations-sent-title" role="status">
      <h2 id="reservations-sent-title" tabIndex={-1}>
        {t("reservations.sent.title")}
      </h2>
      <p className="reservations-muted">{t("reservations.sent.body")}</p>
      <button type="button" className="reservations-secondary" onClick={booking.restart}>
        {t("reservations.sent.another")}
      </button>
    </section>
  );
}

const HOLDING = new Set(["pending", "accepted", "confirmed", "unconfirmed"]);

function GuestReservationsSection({ guest, locale }: { guest: GuestReservations; locale: string }) {
  const { t } = useTranslation();
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  if (!guest.email) {
    return (
      <section className="reservations-card" aria-labelledby="reservations-list-title">
        <h2 id="reservations-list-title">{t("reservations.list.title")}</h2>
        <form
          className="reservations-form"
          onSubmit={(event) => {
            event.preventDefault();
            guest.lookup();
          }}
        >
          <div className="reservations-field">
            <label htmlFor="reservations-lookup">{t("reservations.list.lookupHint")}</label>
            <input
              id="reservations-lookup"
              type="email"
              inputMode="email"
              autoComplete="email"
              value={guest.draft}
              onChange={(event) => guest.setDraft(event.target.value)}
            />
          </div>
          <button type="submit" className="reservations-secondary">
            {t("reservations.list.lookup")}
          </button>
        </form>
      </section>
    );
  }

  return (
    <section className="reservations-card" aria-labelledby="reservations-list-title" aria-busy={guest.loading}>
      <h2 id="reservations-list-title">{t("reservations.list.title")}</h2>
      <p className="reservations-muted">
        {t("reservations.list.forEmail", { email: guest.email })}{" "}
        <button type="button" className="reservations-link" onClick={guest.forget}>
          {t("reservations.list.otherEmail")}
        </button>
      </p>
      {guest.loadFailed ? (
        <p className="reservations-error" role="alert">
          {t("reservations.errors.load")}
        </p>
      ) : null}
      {!guest.loading && !guest.loadFailed && guest.reservations.length === 0 ? (
        <p className="reservations-muted">{t("reservations.list.empty")}</p>
      ) : null}
      {guest.cancelError ? (
        <p className="reservations-error" role="alert">
          {t("reservations.list.cancelError")}
        </p>
      ) : null}
      <ul className="reservations-list">
        {guest.reservations.map((reservation) => (
          <li key={reservation.id}>
            <div>
              <strong>
                {formatSlotDate(reservation.slotDate, locale)} · {formatSlotTime(reservation.slotMinute, locale)}
              </strong>
              <span className="reservations-muted">
                {t("reservations.party.people", { count: reservation.partySize })} ·{" "}
                {t(`reservations.status.${reservation.status}`)}
              </span>
            </div>
            {HOLDING.has(reservation.status) && confirmingId !== reservation.id ? (
              <button type="button" className="reservations-link" onClick={() => setConfirmingId(reservation.id)}>
                {t("reservations.list.cancel")}
              </button>
            ) : null}
            {confirmingId === reservation.id && HOLDING.has(reservation.status) ? (
              <div className="reservations-confirm" role="group" aria-label={t("reservations.list.cancelQuestion")}>
                <span>{t("reservations.list.cancelQuestion")}</span>
                <button
                  type="button"
                  className="reservations-secondary"
                  disabled={guest.cancellingId === reservation.id}
                  onClick={() => void guest.cancel(reservation.id).then(() => setConfirmingId(null))}
                >
                  {t(
                    guest.cancellingId === reservation.id
                      ? "reservations.list.cancelling"
                      : "reservations.list.cancelYes",
                  )}
                </button>
                <button type="button" className="reservations-link" onClick={() => setConfirmingId(null)}>
                  {t("reservations.list.cancelNo")}
                </button>
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
