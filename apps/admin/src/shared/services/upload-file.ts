interface UploadFileInput {
  url: string;
  headers: Record<string, string>;
  file: File;
  signal: AbortSignal;
  onProgress: (loadedBytes: number) => void;
}

/** Resolves only when the server acknowledges receipt, not when upload progress reaches 100%. */
export function uploadFile(input: UploadFileInput): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    const abort = () => request.abort();
    const finish = (error?: Error) => {
      input.signal.removeEventListener("abort", abort);
      if (error) reject(error);
      else resolve();
    };
    request.open("PUT", input.url);
    request.timeout = 5 * 60_000;
    for (const [name, value] of Object.entries(input.headers)) request.setRequestHeader(name, value);
    request.upload.addEventListener("progress", (event) => {
      const loaded =
        event.lengthComputable && event.total > 0 ? (event.loaded / event.total) * input.file.size : event.loaded;
      input.onProgress(Math.min(input.file.size, loaded));
    });
    request.addEventListener("load", () => {
      if (request.status < 200 || request.status >= 300) {
        finish(new Error("No se pudo transferir el archivo. Pulsa Guardar para reintentar."));
        return;
      }
      input.onProgress(input.file.size);
      finish();
    });
    request.addEventListener("error", () =>
      finish(new Error("No se pudo subir el archivo. Comprueba tu conexión y pulsa Guardar.")),
    );
    request.addEventListener("timeout", () =>
      finish(new Error("La subida tardó demasiado. Pulsa Guardar para reintentar.")),
    );
    request.addEventListener("abort", () => finish(new DOMException("Subida interrumpida", "AbortError")));
    input.signal.addEventListener("abort", abort, { once: true });
    if (input.signal.aborted) {
      finish(new DOMException("Subida interrumpida", "AbortError"));
      return;
    }
    request.send(input.file);
  });
}
