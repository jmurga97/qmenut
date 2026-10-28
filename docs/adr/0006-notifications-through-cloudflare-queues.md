# Notifications are delivered through Cloudflare Queues

Each notification is written to a D1 inbox table, which the admin's notifications page
reads, and its pushes are sent from a Cloudflare Queue consumed by `qmenut-api`, with retries
and a dead-letter queue. This follows the `ming-msg-worker` events queue, and `qmenut-api`
gains a queue consumer for reservations anyway. Pushes go to third-party push services that
fail and rate-limit independently of the request that caused the event.

## Considered Options

- **Kafka**: rejected; it does not run on Workers and would be a separate service to operate.
- **Send immediately and retry from the minute cron** (the image outbox of
  [ADR 0001](0001-image-processing-and-publication.md)): rejected; retries, backoff and
  dead-lettering would have to be rebuilt in D1, and a failed push could wait a minute.
