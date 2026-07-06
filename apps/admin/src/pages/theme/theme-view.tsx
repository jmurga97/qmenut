import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";

import { EmptyState } from "@components/empty-state";
import { getErrorMessage } from "@lib/errors";
import { trpc } from "@lib/trpc";
import { useSelectedBranch } from "@lib/use-selected-branch";

const TEMPLATES = [
  { value: "tapas", label: "Tapas · bar casual" },
  { value: "fine", label: "Fine · alta cocina" },
  { value: "cafe", label: "Café · brunch" },
  { value: "fast", label: "Fast · comida rápida" },
  { value: "her", label: "Her · por defecto" },
] as const;

const DEFAULT_PRIMARY = "#A23A28";
const DEFAULT_SECONDARY = "#3F7A4B";

interface StoredTheme {
  template?: string;
  primary?: string;
  secondary?: string;
  tagline?: string;
}

export function ThemeView() {
  const branch = useSelectedBranch();

  if (!branch) {
    return (
      <div className="admin-page">
        <EmptyState title="Sin sucursal" description="Crea una sucursal para personalizar su tema." />
      </div>
    );
  }

  if (!branch.customDomain) {
    return (
      <div className="admin-page">
        <EmptyState
          title="Sin dominio"
          description="El tema se guarda por dominio. Contacta con QMenut para asignar el dominio de esta sucursal."
        />
      </div>
    );
  }

  return <ThemeForm branchId={branch.id} host={branch.customDomain} key={branch.id} />;
}

function ThemeForm({ branchId, host }: { branchId: string; host: string }) {
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const { data: stored } = useSuspenseQuery(trpc.admin.theme.get.queryOptions({ branchId }));
  const current = (stored ?? null) as StoredTheme | null;

  const [template, setTemplate] = useState(current?.template ?? "tapas");
  const [primary, setPrimary] = useState(current?.primary ?? DEFAULT_PRIMARY);
  const [secondary, setSecondary] = useState(current?.secondary ?? DEFAULT_SECONDARY);
  const [tagline, setTagline] = useState(current?.tagline ?? "");

  const saveMutation = useMutation(trpc.admin.theme.save.mutationOptions());

  async function handleSubmit() {
    setServerError(null);
    setSaved(false);

    try {
      await saveMutation.mutateAsync({
        branchId,
        config: {
          template: template as (typeof TEMPLATES)[number]["value"],
          primary,
          secondary,
          tagline: tagline.trim() || undefined,
        },
      });
      await queryClient.invalidateQueries({ queryKey: trpc.admin.theme.get.queryKey({ branchId }) });
      setSaved(true);
    } catch (error) {
      setServerError(getErrorMessage(error));
    }
  }

  return (
    <div className="admin-page">
      <header className="admin-page-header">
        <div className="admin-kicker">Tema · {host}</div>
        <h2>Personalización</h2>
        <p>Plantilla y colores de marca de la carta pública de esta sucursal.</p>
      </header>

      <div className="admin-editor-shell">
        <div className="admin-form-grid">
          <label className="admin-field">
            <span>Plantilla</span>
            <select onChange={(event) => setTemplate(event.currentTarget.value)} value={template}>
              {TEMPLATES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="admin-field">
            <span>Color primario</span>
            <div className="admin-color-row">
              <input onChange={(event) => setPrimary(event.currentTarget.value)} type="color" value={primary} />
              <input onChange={(event) => setPrimary(event.currentTarget.value)} type="text" value={primary} />
            </div>
          </label>

          <label className="admin-field">
            <span>Color secundario</span>
            <div className="admin-color-row">
              <input onChange={(event) => setSecondary(event.currentTarget.value)} type="color" value={secondary} />
              <input onChange={(event) => setSecondary(event.currentTarget.value)} type="text" value={secondary} />
            </div>
          </label>

          <label className="admin-field">
            <span>Eslogan (opcional)</span>
            <input
              maxLength={120}
              onChange={(event) => setTagline(event.currentTarget.value)}
              placeholder="Cocina de barrio desde 1998"
              type="text"
              value={tagline}
            />
          </label>
        </div>

        <section className="admin-editor-section">
          <div className="admin-kicker">Vista previa</div>
          <div className="admin-theme-preview" style={{ borderColor: primary }}>
            <span className="admin-theme-swatch" style={{ background: primary }} />
            <span className="admin-theme-swatch" style={{ background: secondary }} />
            <span className="admin-list-meta">{tagline || "Sin eslogan"}</span>
          </div>
        </section>

        {serverError ? <mc-inline-message message={serverError} tone="error" /> : null}
        {saved ? <mc-inline-message message="Tema guardado." tone="success" /> : null}

        <div className="admin-topbar-actions">
          <mc-button disabled={saveMutation.isPending} onClick={() => void handleSubmit()} variant="primary">
            {saveMutation.isPending ? "Guardando…" : "Guardar tema"}
          </mc-button>
        </div>
      </div>
    </div>
  );
}
