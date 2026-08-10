import { useQuery } from "@tanstack/react-query";
import { useId, useRef, useState } from "react";
import { useController, useFormContext, useWatch } from "react-hook-form";

import { trpc } from "~/lib/trpc";
import { useDebouncedCallback } from "~/shared/hooks/use-debounced-callback";

import { getAddressSuggestionsQueryOptions } from "../api";

import type { BranchFormValues } from "../types";
import type { FocusEvent, KeyboardEvent } from "react";

const SEARCH_DELAY_MS = 350;
const MIN_QUERY_LENGTH = 3;

interface BranchAddressAutocompleteProps {
  branchId: string;
}

interface AddressSuggestion {
  id: string;
  label: string;
  latitude: number;
  longitude: number;
}

interface AddressResultsProps {
  activeIndex: number;
  attribution?: string;
  fetching: boolean;
  listboxId: string;
  onSelect: (index: number) => void;
  rateLimited: boolean;
  requestFailed: boolean;
  suggestions: AddressSuggestion[];
}

function AddressResults({
  activeIndex,
  attribution,
  fetching,
  listboxId,
  onSelect,
  rateLimited,
  requestFailed,
  suggestions,
}: AddressResultsProps) {
  return (
    <div className="admin-address-results" id={listboxId} role="listbox">
      {fetching ? <div className="admin-address-state">Buscando direcciones…</div> : null}
      {rateLimited ? (
        <div className="admin-address-state" role="status">
          Has alcanzado el límite de búsquedas. Espera un minuto antes de continuar.
        </div>
      ) : null}
      {requestFailed && !rateLimited ? (
        <div className="admin-address-state" role="status">
          No se pudo buscar ahora. Puedes guardar la dirección sin mapa.
        </div>
      ) : null}
      {!fetching && !requestFailed && suggestions.length === 0 ? (
        <div className="admin-address-state">No hay resultados para esta búsqueda.</div>
      ) : null}
      {suggestions.map((suggestion, index) => (
        <button
          aria-selected={activeIndex === index}
          className="admin-address-option"
          id={`${listboxId}-${index}`}
          key={suggestion.id}
          onClick={() => onSelect(index)}
          onMouseDown={(event) => event.preventDefault()}
          role="option"
          type="button"
        >
          {suggestion.label}
        </button>
      ))}
      {attribution ? <div className="admin-address-attribution">{attribution}</div> : null}
    </div>
  );
}

export function BranchAddressAutocomplete({ branchId }: BranchAddressAutocompleteProps) {
  const inputId = useId();
  const listboxId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [open, setOpen] = useState(false);
  const { control, formState, getFieldState, setValue } = useFormContext<BranchFormValues>();
  const { field } = useController({ control, name: "address" });
  const [latitude, longitude] = useWatch({ control, name: ["latitude", "longitude"] });
  const linked = Boolean(latitude && longitude);
  const error = getFieldState("address", formState).error?.message;
  const debounceSearch = useDebouncedCallback(setDebouncedQuery, SEARCH_DELAY_MS);
  const normalizedQuery = debouncedQuery.trim();
  const suggestionsQuery = useQuery({
    ...getAddressSuggestionsQueryOptions({ branchId, query: normalizedQuery, trpc }),
    enabled: normalizedQuery.length >= MIN_QUERY_LENGTH,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
  const suggestions = suggestionsQuery.data?.suggestions ?? [];
  const rateLimited = suggestionsQuery.error?.data?.code === "TOO_MANY_REQUESTS";
  const searchReady = normalizedQuery.length >= MIN_QUERY_LENGTH && normalizedQuery === field.value.trim();

  function clearCoordinates() {
    setValue("latitude", "", { shouldDirty: true, shouldValidate: true });
    setValue("longitude", "", { shouldDirty: true, shouldValidate: true });
  }

  function handleInput(value: string) {
    field.onChange(value);
    if (linked) clearCoordinates();
    setActiveIndex(-1);
    setOpen(true);
    debounceSearch(value);
  }

  function selectSuggestion(index: number) {
    const suggestion = suggestions[index];
    if (!suggestion) return;

    field.onChange(suggestion.label);
    setValue("latitude", String(suggestion.latitude), { shouldDirty: true, shouldValidate: true });
    setValue("longitude", String(suggestion.longitude), { shouldDirty: true, shouldValidate: true });
    setActiveIndex(-1);
    setDebouncedQuery("");
    setOpen(false);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!open || suggestions.length === 0) return;

    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        setActiveIndex((current) => (current + 1) % suggestions.length);
        break;
      case "ArrowUp":
        event.preventDefault();
        setActiveIndex((current) => (current <= 0 ? suggestions.length : current) - 1);
        break;
      case "Enter":
        if (activeIndex < 0) return;
        event.preventDefault();
        selectSuggestion(activeIndex);
        break;
      case "Escape":
        setOpen(false);
        setActiveIndex(-1);
        break;
      default:
        break;
    }
  }

  function handleBlur(event: FocusEvent<HTMLDivElement>) {
    if (rootRef.current?.contains(event.relatedTarget)) return;

    field.onBlur();
    setOpen(false);
  }

  return (
    <div className="admin-address-autocomplete" onBlur={handleBlur} ref={rootRef}>
      <label className="admin-field" htmlFor={inputId}>
        <span>Dirección</span>
        <input
          aria-activedescendant={activeIndex < 0 ? undefined : `${listboxId}-${activeIndex}`}
          aria-autocomplete="list"
          aria-controls={listboxId}
          aria-expanded={open && searchReady}
          aria-invalid={Boolean(error)}
          autoComplete="off"
          id={inputId}
          onChange={(event) => handleInput(event.currentTarget.value)}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          ref={field.ref}
          role="combobox"
          value={field.value}
        />
        {error ? <small role="alert">{error}</small> : null}
      </label>

      {open && searchReady ? (
        <AddressResults
          activeIndex={activeIndex}
          attribution={suggestionsQuery.data?.attribution}
          fetching={suggestionsQuery.isFetching}
          listboxId={listboxId}
          onSelect={selectSuggestion}
          rateLimited={rateLimited}
          requestFailed={suggestionsQuery.isError}
          suggestions={suggestions}
        />
      ) : null}

      {linked ? (
        <div className="admin-address-linked">
          <span>Ubicación del mapa vinculada</span>
          <button onClick={clearCoordinates} type="button">
            Quitar ubicación del mapa
          </button>
        </div>
      ) : (
        <p className="admin-field-hint">Selecciona una sugerencia para mostrar esta sucursal en el mapa público.</p>
      )}
    </div>
  );
}
