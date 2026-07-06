import { TRPCError } from "@trpc/server";

interface DeeplTranslateInput {
  apiKey: string;
  apiUrl: string;
  sourceLang?: string;
  tagHandling?: "html";
  targetLang: string;
  texts: string[];
}

interface DeeplResponseBody {
  translations: { detected_source_language: string; text: string }[];
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

  const response = await fetch(`${apiUrl.replace(/\/+$/, "")}/v2/translate`, {
    method: "POST",
    headers: {
      Authorization: `DeepL-Auth-Key ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text: texts,
      target_lang: targetLang,
      ...(sourceLang ? { source_lang: sourceLang } : {}),
      ...(tagHandling ? { tag_handling: tagHandling } : {}),
    }),
  });

  if (response.status === 429 || response.status === 456) {
    throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "DeepL rate limit or quota exceeded" });
  }

  if (!response.ok) {
    throw new TRPCError({ code: "BAD_GATEWAY", message: `DeepL request failed (${response.status})` });
  }

  const body = (await response.json()) as DeeplResponseBody;

  return body.translations.map((translation) => translation.text);
}
