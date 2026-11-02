import { Button, Field, InlineMessage, Input, OverviewPanel, StatusText } from "@jmurga97/components";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { errorMessage } from "~/lib/query-client";
import { trpc, trpcClient } from "~/lib/trpc";
import { count } from "~/shared/format";

import { MAX_LEADS, parseLeads } from "./parse-leads";

import type { ParsedLeads } from "./parse-leads";

const CHECK_PAGE = 2000;
const IMPORT_PAGE = 1000;

interface Preview {
  fileName: string;
  parsed: ParsedLeads;
  existing: Set<string>;
}

async function findExisting(emails: string[], onProgress: (done: number) => void): Promise<Set<string>> {
  const existing = new Set<string>();
  for (let index = 0; index < emails.length; index += CHECK_PAGE) {
    const page = await trpcClient.lab.leads.existing.mutate({ emails: emails.slice(index, index + CHECK_PAGE) });
    for (const email of page.existing) existing.add(email);
    onProgress(Math.min(emails.length, index + CHECK_PAGE));
  }

  return existing;
}

export function ImportPanel() {
  const queryClient = useQueryClient();
  const [preview, setPreview] = useState<Preview | null>(null);
  const [label, setLabel] = useState("");
  const [fileError, setFileError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string | null>(null);

  async function readFile(file: File | undefined) {
    setPreview(null);
    setFileError(null);
    if (!file) return;
    try {
      const parsed = parseLeads(file.name, await file.text());
      if (parsed.tooMany) throw new Error(`El archivo supera ${count(MAX_LEADS)} contactos. Divídelo en partes.`);
      const emails = parsed.valid.map((lead) => lead.email);
      const existing = await findExisting(emails, (done) =>
        setProgress(`Comprobando duplicados: ${count(done)} de ${count(emails.length)}…`),
      );
      setLabel(file.name.replace(/\.[^.]+$/, "").slice(0, 80));
      setPreview({ fileName: file.name, parsed, existing });
    } catch (error) {
      setFileError(errorMessage(error));
    } finally {
      setProgress(null);
    }
  }

  async function runImport(current: Preview) {
    const leads = current.parsed.valid.filter((lead) => !current.existing.has(lead.email));
    let inserted = 0;
    try {
      for (let index = 0; index < leads.length; index += IMPORT_PAGE) {
        setProgress(`Importando ${count(index)} de ${count(leads.length)}…`);
        const result = await trpcClient.lab.leads.import.mutate({
          label: label.trim() || current.fileName,
          leads: leads.slice(index, index + IMPORT_PAGE),
        });
        inserted += result.inserted;
      }
      toast.success(`${count(inserted)} contactos importados.`);
      setPreview(null);
    } catch (error) {
      // Pages already imported stay; importing the same file again skips them.
      toast.error(`${errorMessage(error)} Se importaron ${count(inserted)} antes del error.`);
    } finally {
      setProgress(null);
      await queryClient.invalidateQueries({ queryKey: trpc.lab.leads.list.pathKey() });
      await queryClient.invalidateQueries({ queryKey: trpc.lab.schedule.pathKey() });
    }
  }

  const fresh = preview ? preview.parsed.valid.length - preview.existing.size : 0;

  return (
    <section aria-labelledby="import-title" className="ming-section">
      <div>
        <h2 className="ming-section__title" id="import-title">
          Importar contactos
        </h2>
        <p className="ming-section__description">
          CSV con columna email o correo (y opcionalmente name o nombre), o un arreglo JSON. Hasta {count(MAX_LEADS)}{" "}
          contactos por archivo.
        </p>
      </div>
      <Field error={fileError} invalid={Boolean(fileError)} label="Archivo">
        <input
          accept=".csv,.json,text/csv,application/json"
          className="lab-file"
          disabled={progress !== null}
          onChange={(event) => void readFile(event.currentTarget.files?.[0])}
          type="file"
        />
      </Field>
      {progress ? <StatusText label={progress} polite tone="info" /> : null}
      {preview ? (
        <div className="ming-stack">
          <OverviewPanel
            title={preview.fileName}
            stats={[
              { id: "new", label: "Nuevos", value: count(fresh) },
              { id: "existing", label: "Ya importados", value: count(preview.existing.size) },
              { id: "duplicates", label: "Repetidos en el archivo", value: count(preview.parsed.duplicates) },
              { id: "invalid", label: "Correos inválidos", value: count(preview.parsed.invalid.length) },
            ]}
          />
          {preview.parsed.invalid.length > 0 ? (
            <InlineMessage
              message={`Se omitirán: ${preview.parsed.invalid.slice(0, 8).join(", ")}${preview.parsed.invalid.length > 8 ? "…" : ""}`}
              title="Correos inválidos"
              tone="warning"
            />
          ) : null}
          <div className="lab-form">
            <Field hint="Identifica el origen al filtrar contactos." label="Etiqueta de importación">
              <Input maxLength={80} onValueChange={setLabel} value={label} />
            </Field>
            <div className="ming-cluster">
              <Button disabled={fresh === 0 || progress !== null} onClick={() => void runImport(preview)}>
                {`Importar ${count(fresh)} contactos`}
              </Button>
              <Button onClick={() => setPreview(null)} variant="ghost">
                Descartar
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
