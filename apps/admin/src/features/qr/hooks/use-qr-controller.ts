import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";

import { buildQrFileBase, buildQrUrl, downloadQr, renderQrPreview } from "../services";

const qrFormSchema = z.object({
  size: z.enum(["512", "1024", "2048"]),
  target: z.enum(["menu", "loyalty"]),
});
type QrFormValues = z.infer<typeof qrFormSchema>;
export function useQrController(host: string) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<unknown>(null);
  const [copied, setCopied] = useState(false);
  const form = useForm<QrFormValues>({
    resolver: zodResolver(qrFormSchema),
    defaultValues: { size: "1024", target: "menu" },
  });
  const size = Number(useWatch({ control: form.control, name: "size" }));
  const target = useWatch({ control: form.control, name: "target" });
  const url = buildQrUrl(host, target);
  const fileBase = buildQrFileBase(host, target);
  useEffect(() => {
    if (canvasRef.current) {
      void renderQrPreview(canvasRef.current, url).catch(setError);
    }
  }, [url]);
  async function run(action: () => Promise<void>) {
    setError(null);
    try {
      await action();
    } catch (actionError) {
      setError(actionError);
    }
  }
  const copy = () =>
    run(async () => {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    });
  const download = (format: "png" | "svg") => run(() => downloadQr({ fileBase, format, size, url }));
  return { canvasRef, copy, download, error, form, success: copied ? "URL copiada." : null, url };
}
