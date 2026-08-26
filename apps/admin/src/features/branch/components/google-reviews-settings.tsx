import { Button, Checkbox, Field, InlineMessage, Input } from "@jmurga97/components";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { trpc } from "~/lib/trpc";

import { getGooglePlaceCandidatesQueryOptions, getGoogleReviewsConnectionMutationOptions } from "../api";

interface GoogleReviewsSettingsProps {
  address: string | null;
  branchId: string;
  branchName: string;
  enabled: boolean;
  placeId: string | null;
}

function googleMapsHref(placeId: string): string {
  const url = new URL("https://www.google.com/maps/search/");
  url.searchParams.set("api", "1");
  url.searchParams.set("query", "Google");
  url.searchParams.set("query_place_id", placeId);
  return url.href;
}

export function GoogleReviewsSettings({ address, branchId, branchName, enabled, placeId }: GoogleReviewsSettingsProps) {
  const queryClient = useQueryClient();
  const [query, setQuery] = useState([branchName, address].filter(Boolean).join(" · "));
  const [searchVisible, setSearchVisible] = useState(placeId === null);
  const normalizedQuery = query.trim();
  const candidatesQuery = useQuery({
    ...getGooglePlaceCandidatesQueryOptions({ branchId, query: normalizedQuery, trpc }),
    enabled: false,
    retry: false,
    staleTime: 0,
  });
  const connection = useMutation(getGoogleReviewsConnectionMutationOptions({ branchId, queryClient, trpc }));
  const candidates = candidatesQuery.data?.candidates ?? [];
  const busy = candidatesQuery.isFetching || connection.isPending;

  function search() {
    if (normalizedQuery.length < 3) return;
    void candidatesQuery.refetch();
  }

  async function saveConnection(nextPlaceId: string | null, nextEnabled: boolean) {
    await connection.mutateAsync({ branchId, placeId: nextPlaceId, enabled: nextEnabled });
  }

  async function selectCandidate(candidateId: string) {
    await saveConnection(candidateId, false);
    setSearchVisible(false);
  }

  async function disconnect() {
    await saveConnection(null, false);
    setSearchVisible(true);
  }

  return (
    <section className="admin-editor-section admin-google-reviews">
      <div>
        <div className="admin-kicker">Reseñas de Google</div>
        <p className="admin-google-reviews__intro">
          Conecta la ficha exacta de esta sucursal. Google elige y ordena las reseñas que aparecen en la página de
          contacto.
        </p>
      </div>

      {placeId ? (
        <div className="admin-google-reviews__connection">
          <div>
            <strong>Ficha de Google Maps conectada</strong>
            <span>La conexión se guarda por sucursal.</span>
          </div>
          <div className="admin-google-reviews__actions">
            <a className="admin-link" href={googleMapsHref(placeId)} rel="noreferrer" target="_blank">
              Abrir en Google Maps ↗
            </a>
            <Button disabled={busy} onClick={() => setSearchVisible(true)} variant="secondary">
              Cambiar
            </Button>
            <Button
              className="admin-google-reviews__disconnect"
              disabled={busy}
              onClick={() => void disconnect()}
              variant="secondary"
            >
              Desconectar
            </Button>
          </div>
        </div>
      ) : null}

      {searchVisible ? (
        <form
          className="admin-google-reviews__search"
          onSubmit={(event) => {
            event.preventDefault();
            search();
          }}
        >
          <Field label="Buscar negocio o ficha">
            <div className="admin-google-reviews__search-row">
              <Input
                disabled={busy}
                onValueChange={setQuery}
                placeholder="Nombre y dirección de la sucursal"
                type="search"
                value={query}
              />
              <Button disabled={busy || normalizedQuery.length < 3} type="submit" variant="primary">
                {candidatesQuery.isFetching ? "Buscando…" : "Buscar"}
              </Button>
            </div>
          </Field>

          {candidatesQuery.isError ? (
            <InlineMessage
              message="No se pudieron buscar fichas en este momento. Revisa la consulta e inténtalo de nuevo."
              tone="error"
            />
          ) : null}
          {candidatesQuery.isSuccess && candidates.length === 0 ? (
            <p className="admin-google-reviews__status" role="status">
              No se encontraron fichas para esta búsqueda.
            </p>
          ) : null}
          {candidates.length > 0 ? (
            <div className="admin-google-reviews__candidates">
              {candidates.map((candidate) => (
                <article className="admin-google-reviews__candidate" key={candidate.id}>
                  <div>
                    <h3>{candidate.name}</h3>
                    <p>{candidate.address}</p>
                    <p className="admin-google-reviews__rating">
                      {candidate.rating === null ? "Sin valoración" : `${candidate.rating.toFixed(1)} ★`}
                      {` · ${candidate.ratingCount} reseñas`}
                    </p>
                    <small>
                      <span className="admin-google-reviews__google-attribution" translate="no">
                        {candidatesQuery.data?.attribution}
                      </span>
                      {candidate.attributions.map((attribution) => ` · ${attribution.provider}`).join("")}
                    </small>
                  </div>
                  <Button disabled={busy} onClick={() => void selectCandidate(candidate.id)} variant="primary">
                    Conectar esta ficha
                  </Button>
                </article>
              ))}
            </div>
          ) : null}
        </form>
      ) : null}

      <div className="admin-google-reviews__toggle">
        <Checkbox
          checked={enabled}
          disabled={!placeId || busy}
          label="Mostrar reseñas en la página de contacto"
          onCheckedChange={(checked) => void saveConnection(placeId, checked)}
        />
      </div>
      {placeId ? null : <p className="admin-field-hint">Conecta una ficha antes de activar las reseñas.</p>}
      {connection.error ? (
        <InlineMessage message="No se pudo actualizar la conexión. Inténtalo de nuevo." tone="error" />
      ) : null}
    </section>
  );
}
