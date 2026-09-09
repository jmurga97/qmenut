import { TRPCError } from "@trpc/server";
import { z } from "zod";

interface DeeplTranslateInput {
  apiKey: string;
  apiUrl: string;
  sourceLang?: string;
  tagHandling?: "html";
  targetLang: string;
  texts: string[];
}

/** DeepL REST v2. Caller is responsible for chunking (DeepL accepts up to 50 texts/request). */
export async function deeplTranslate({
  apiKey,
  apiUrl,
  sourceLang,
  tagHandling,
  targetLang,
  texts,
}: DeeplTranslateInput): Promise<string[]> {
  if (texts.length === 0) {
    return [];
  }

  const baseUrl = apiUrl.endsWith("/") ? apiUrl.slice(0, -1) : apiUrl;
  const response = await fetch(`${baseUrl}/v2/translate`, {
    method: "POST",
    signal: AbortSignal.timeout(15_000),
    headers: {
      Authorization: `DeepL-Auth-Key ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text: texts,
      target_lang: targetLang,
      ...(sourceLang && { source_lang: sourceLang }),
      ...(tagHandling && { tag_handling: tagHandling }),
    }),
  });

  if (response.status === 429 || response.status === 456) {
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: "Se ha superado el límite de solicitudes o la cuota de DeepL",
    });
  }

  if (!response.ok) {
    throw new TRPCError({
      code: "BAD_GATEWAY",
      message: `La solicitud a DeepL ha fallado (${response.status})`,
    });
  }

  const translationSchema = z.object({ text: z.string() });
  const body = z
    .object({ translations: z.array(translationSchema).length(texts.length) })
    .safeParse(await response.json());
  if (!body.success) {
    throw new TRPCError({ code: "BAD_GATEWAY", message: "DeepL devolvió una respuesta de traducción no válida" });
  }
  return body.data.translations.map((translation) => translation.text);
}
