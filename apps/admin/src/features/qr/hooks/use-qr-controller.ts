import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useRef } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { notifyError } from "~/lib/notifications";

import { buildQrFileBase, buildQrUrl, downloadQr, renderQrPreview } from "../services";

const qrFormSchema = z.object({
  size: z.enum(["512", "1024", "2048"]),
  target: z.enum(["menu", "loyalty"]),
});
type QrFormValues = z.infer<typeof qrFormSchema>;

async function runAction(action: () => Promise<void>): Promise<void> {
  try {
    await action();
  } catch (actionError) {
    notifyError(actionError);
  }
}

export function useQrController(host: string) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
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
      void renderQrPreview(canvasRef.current, url).catch(notifyError);
    }
  }, [url]);
  const copy = () =>
    runAction(async () => {
      await navigator.clipboard.writeText(url);
      toast.success("URL copiada.");
    });
  const download = (format: "png" | "svg") => runAction(() => downloadQr({ fileBase, format, size, url }));
  return { canvasRef, copy, download, form, url };
}
