import { Badge, Button, Field, InlineMessage, Input, Select, Textarea } from "@jmurga97/components";
import { useMutation, useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";

import * as api from "~/features/messaging/api";
import { i18n } from "~/lib/i18n";
import { trpc } from "~/lib/trpc";
import { PageHeader } from "~/shared/components/page-header";

type TemplateId = "hello_world" | "reservation_attendance";

const TEMPLATE_OPTIONS = [
  { id: "hello_world", label: "hello_world" },
  { id: "reservation_attendance", label: "reservation_attendance" },
];

const RESERVATION_FIELDS = [
  { name: "customerName", label: i18n.t("messaging___Cliente") },
  { name: "restaurantName", label: i18n.t("messaging___Restaurante") },
  { name: "date", label: i18n.t("messaging___Fecha") },
  { name: "time", label: i18n.t("messaging___Hora") },
  { name: "partySize", label: i18n.t("messaging___Personas") },
] as const;

function formatTime(value: number): string {
  return new Intl.DateTimeFormat(i18n.resolvedLanguage ?? "es", { dateStyle: "short", timeStyle: "short" }).format(
    new Date(value),
  );
}

function SendTemplateCard({ onSent }: { onSent: (conversationId: string) => void }) {
  const queryClient = useQueryClient();
  const send = useMutation(api.getSendMutationOptions({ queryClient, trpc }));
  const [templateId, setTemplateId] = useState<TemplateId>("hello_world");
  const [to, setTo] = useState("");
  const [data, setData] = useState<Record<string, string>>({});

  function submit() {
    const payload = templateId === "hello_world" ? {} : data;
    send.mutate(
      { idempotencyKey: crypto.randomUUID(), templateId, to: to.trim(), data: payload },
      { onSuccess: (result) => onSent(result.conversationId) },
    );
  }

  return (
    <section className={"admin-card"} aria-labelledby={"messaging-send-title"}>
      <h2 id={"messaging-send-title"}>{i18n.t("messaging___Enviar plantilla")}</h2>
      <Field label={i18n.t("messaging___Plantilla")}>
        <Select
          ariaLabel={i18n.t("messaging___Plantilla")}
          onValueChange={(value) => value && setTemplateId(value as TemplateId)}
          options={TEMPLATE_OPTIONS}
          value={templateId}
        />
      </Field>
      <Field label={i18n.t("messaging___Teléfono (E.164)")}>
        <Input inputMode={"tel"} onValueChange={setTo} placeholder={"+34600000000"} value={to} />
      </Field>
      {templateId === "reservation_attendance"
        ? RESERVATION_FIELDS.map((field) => (
            <Field key={field.name} label={field.label}>
              <Input
                onValueChange={(value) => setData((current) => ({ ...current, [field.name]: value }))}
                value={data[field.name] ?? ""}
              />
            </Field>
          ))
        : null}
      <Button disabled={send.isPending || !to.trim()} onClick={submit}>
        {i18n.t("messaging___Enviar")}
      </Button>
    </section>
  );
}

function ConversationPanel({ conversationId, windowOpen }: { conversationId: string; windowOpen: boolean }) {
  const queryClient = useQueryClient();
  const { data: events = [] } = useQuery(api.getEventsQueryOptions({ trpc, conversationId }));
  const reply = useMutation(api.getReplyMutationOptions({ queryClient, trpc }));
  const [text, setText] = useState("");

  return (
    <section className={"admin-card"} aria-label={i18n.t("messaging___Conversación")}>
      <ol>
        {events.map((event) => (
          <li key={event.id}>
            <Badge tone={event.direction === "in" ? "success" : "neutral"}>{event.type}</Badge>{" "}
            {event.status || event.buttonId || event.text} {event.errorCode ? `(${event.errorCode})` : null}{" "}
            <small>{formatTime(event.createdAt)}</small>
          </li>
        ))}
      </ol>
      {windowOpen ? null : (
        <InlineMessage tone={"warning"}>
          {i18n.t("messaging___La ventana de 24 h está cerrada: solo se pueden enviar plantillas.")}
        </InlineMessage>
      )}
      <Field label={i18n.t("messaging___Respuesta")}>
        <Textarea disabled={!windowOpen} maxLength={4096} onValueChange={setText} rows={3} value={text} />
      </Field>
      <Button
        disabled={!windowOpen || reply.isPending || !text.trim()}
        onClick={() => reply.mutate({ conversationId, text }, { onSuccess: () => setText("") })}
      >
        {i18n.t("messaging___Responder")}
      </Button>
    </section>
  );
}

export function MessagingPage() {
  const { data } = useSuspenseQuery(api.getConversationsQueryOptions({ trpc }));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = data.conversations.find((conversation) => conversation.conversationId === selectedId);

  return (
    <div className={"ming-page admin-page"}>
      <PageHeader kicker={"ming-msg-worker"} title={i18n.t("messaging___Mensajería")} />
      {data.configured ? null : (
        <InlineMessage tone={"error"}>
          {i18n.t("messaging___MSG_WORKER no está configurado en este entorno.")}
        </InlineMessage>
      )}
      <SendTemplateCard onSent={setSelectedId} />
      <section className={"admin-card"} aria-labelledby={"messaging-conversations-title"}>
        <h2 id={"messaging-conversations-title"}>{i18n.t("messaging___Conversaciones")}</h2>
        <ul>
          {data.conversations.map((conversation) => (
            <li key={conversation.conversationId}>
              <Button
                aria-pressed={conversation.conversationId === selectedId}
                onClick={() => setSelectedId(conversation.conversationId)}
                variant={"ghost"}
              >
                {conversation.conversationId.slice(0, 8)} · {formatTime(conversation.lastEventAt)}
              </Button>
            </li>
          ))}
        </ul>
      </section>
      {selectedId ? <ConversationPanel conversationId={selectedId} windowOpen={selected?.replyOpen ?? false} /> : null}
    </div>
  );
}
