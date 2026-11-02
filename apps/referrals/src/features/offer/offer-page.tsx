import { InlineMessage, StatusText } from "@jmurga97/components";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useEffect } from "react";

import { trpc } from "~/lib/trpc";
import { usd } from "~/shared/fields";

import { JoinForm } from "./join-form";

const INVITE_CODE = /^[0-9a-f]{32}$/;

/** Counts one browser visit per invitation and tab session, so reloads and StrictMode do not inflate it. */
function useVisit(code: string | null) {
  const visit = useMutation(trpc.referrals.visit.mutationOptions({ onError: () => null }));
  const { mutate } = visit;

  useEffect(() => {
    if (!code) return;
    const key = `qm-visit-${code}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      // Storage blocked: count the visit anyway.
    }
    mutate({ code });
  }, [code, mutate]);
}

export function OfferPage({ code = null }: { code?: string | null }) {
  const validCode = code && INVITE_CODE.test(code) ? code : null;
  const offer = useQuery(trpc.referrals.offer.queryOptions({ code: validCode }));
  useVisit(validCode);

  if (!offer.data) {
    return offer.error ? (
      <InlineMessage message="No pudimos cargar la oferta. Recarga la página." tone="error" />
    ) : (
      <StatusText label="Cargando oferta…" tone="info" />
    );
  }

  const reward = usd(offer.data.rewardCents);

  return (
    <>
      <header className="ming-page-header">
        <div className="ming-page-header__title">
          <p className="ming-eyebrow">{offer.data.invited ? "Tu invitación" : "QMenut Referidos"}</p>
          <h1>{`Gana ${reward} por cada restaurante que nos presentes`}</h1>
          <p>
            QMenut le da a cada restaurante su carta, reservas y fidelización en su propia web. Si conoces uno al que le
            sirva, preséntanoslo.
          </p>
        </div>
      </header>
      {code && !offer.data.invited ? (
        <InlineMessage
          message="Este enlace de invitación no es válido. Igual puedes participar con la oferta pública."
          tone="warning"
        />
      ) : null}
      <section aria-labelledby="how-title" className="ming-section">
        <h2 className="ming-section__title" id="how-title">
          Cómo funciona
        </h2>
        <ol className="ref-steps">
          <li>Nos presentas el restaurante con este formulario y confirmas tu correo.</li>
          <li>Lo contactamos y le mostramos QMenut.</li>
          <li>{`Si contrata QMenut Business anual, te pagamos ${reward} por Pago Móvil.`}</li>
        </ol>
      </section>
      <section aria-labelledby="rules-title" className="ming-section">
        <h2 className="ming-section__title" id="rules-title">
          Condiciones
        </h2>
        <ul className="ref-rules">
          <li>{`Sin límite de restaurantes: tu recompensa de ${reward} se mantiene para cada uno.`}</li>
          <li>Califica QMenut Business pagado por un año: $39 al mes, $468 al año.</li>
          <li>Pagamos una recompensa por restaurante nuevo, a quien lo presentó primero.</li>
          <li>
            Pagamos en bolívares por Pago Móvil a la tasa del día. Te pedimos tus datos de pago cuando aprobamos tu
            primer referido.
          </li>
        </ul>
      </section>
      <section aria-labelledby="form-title" className="ming-section">
        <div>
          <h2 className="ming-section__title" id="form-title">
            Presenta un restaurante
          </h2>
          <p className="ming-section__description">
            ¿Ya participas? <Link to="/acceso">Entra con tu correo</Link> para ver tus referidos.
          </p>
        </div>
        <JoinForm invited={offer.data.invited} />
      </section>
    </>
  );
}
