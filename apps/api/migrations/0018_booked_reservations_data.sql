-- ADR 0008: reservations are booked at once and the guest may confirm by email link. Every
-- reservation that still holds a table becomes pending (not confirmed by the guest yet), and
-- declined requests become staff cancellations. Runs before 0019 tightens the status check.
UPDATE reservations SET status = 'pending', updated_at = unixepoch() * 1000
WHERE status IN ('accepted', 'unconfirmed');
--> statement-breakpoint
UPDATE reservations SET status = 'cancelled', cancelled_by = 'staff', updated_at = unixepoch() * 1000
WHERE status = 'declined';
--> statement-breakpoint
-- The reminder email replaces the 2 h WhatsApp check; branches still on that default move to 24 h.
UPDATE reservation_settings SET check_before_minutes = 1440 WHERE check_before_minutes = 120;
--> statement-breakpoint
-- New reservations are news, not requests to answer; unconfirmed notifications no longer exist.
UPDATE notifications SET type = 'reservation.booked', actionable = 0 WHERE type = 'reservation.requested';
--> statement-breakpoint
DELETE FROM notifications WHERE type = 'reservation.unconfirmed';
