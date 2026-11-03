import { Button, Field, InlineMessage, Input } from "@jmurga97/components";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";

import { trpc } from "~/lib/trpc";

/** The emailed secret rides in the URL fragment; read it once and drop it from the address bar. */
function takeToken(): string | null {
  const token = globalThis.location.hash.slice(1);
  if (!token) return null;
  globalThis.history.replaceState(null, "", globalThis.location.pathname);

  return token;
}

function RequestLink() {
  const [email, setEmail] = useState("");
  const request = useMutation(trpc.referrals.requestAccess.mutationOptions());

  if (request.isSuccess) {
    return (
      <InlineMessage
        message="Si ese correo participa en el programa, te llegará un enlace de acceso que vence en 1 hora."
        role="status"
        title="Revisa tu correo"
        tone="success"
      />
    );
  }

  return (
    <form
      className="ref-form"
      onSubmit={(event) => {
        event.preventDefault();
        request.mutate({ email });
      }}
    >
      <Field label="Tu correo">
        <Input autoComplete="email" onValueChange={setEmail} required type="email" value={email} />
      </Field>
      <Button disabled={request.isPending} type="submit">
        {request.isPending ? "Enviando…" : "Enviarme un enlace"}
      </Button>
    </form>
  );
}

export function AccessPage() {
  const navigate = useNavigate();
  const [token] = useState(takeToken);
  const exchange = useMutation(
    trpc.referrals.exchange.mutationOptions({
      onError: () => null,
      onSuccess: () => navigate({ to: "/mis-referidos" }),
    }),
  );

  return (
    <>
      <header className="ming-page-header">
        <div className="ming-page-header__title">
          <p className="ming-eyebrow">QMenut Referidos</p>
          <h1>{token ? "Confirma para entrar" : "Entra a tus referidos"}</h1>
          <p>
            {token
              ? "Toca el botón para confirmar tu correo y abrir tus referidos en este dispositivo."
              : "Te enviamos un enlace de un solo uso. No necesitas contraseña."}
          </p>
        </div>
      </header>
      {token && !exchange.isError ? (
        // A tap, not page load: email scanners open links, and the link only works once.
        <div>
          <Button disabled={exchange.isPending} onClick={() => exchange.mutate({ token })} size="lg">
            {exchange.isPending ? "Entrando…" : "Confirmar y entrar"}
          </Button>
        </div>
      ) : (
        <>
          {exchange.isError ? (
            <InlineMessage message="El enlace expiró o ya se usó. Pide uno nuevo." tone="warning" />
          ) : null}
          <RequestLink />
        </>
      )}
    </>
  );
}
