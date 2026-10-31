# WhatsApp reservation messages go through ming-msg-worker, not the Meta MCP

On hold: reservations no longer send WhatsApp messages while the Meta account is unavailable
([ADR 0008](0008-reservations-are-booked-and-confirmed-by-email.md) moved the attendance check to
an email reminder). The transport and the support console stay as described here.

Reservation messages (the attendance check and its Confirm/Cancel replies) are sent and
received at runtime through `ming-msg-worker`, the product-agnostic Ming messaging service
that calls the WhatsApp Cloud API with a system-user token. Meta's WhatsApp Business Tools
MCP is used only as a developer tool for setup: creating templates and configuring
webhooks. The MCP authenticates as a person over OAuth that has to be renewed whenever the
client restarts, is in beta with per-user rate limits, and offers no way to read inbound
messages or button replies, so a Worker cannot depend on it unattended.

## Considered Options

- **An agent calling the MCP at runtime**: rejected for the reasons above.
- **Calling the Cloud API directly from qmenut-api**: rejected; the worker already owns
  the transport, opt-outs and webhooks for every Ming product, and Qmenut keeps only the
  reservation logic.
