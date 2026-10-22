import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { i18n } from "~/lib/i18n";
import { notifyError } from "~/lib/notifications";
import { buildQrUrl } from "~/shared/services/qr";

import { buildQrFileBase, downloadQr } from "../services";

const qrFormSchema = z.object({
  size: z.enum(["512", "1024", "2048"]),
  target: z.enum(["menu", "reviews", "loyalty"]),
});
type QrFormValues = z.infer<typeof qrFormSchema>;

async function runAction(action: () => Promise<void>): Promise<void> {
  try {
    await action();
  } catch (actionError) {
    notifyError(actionError);
  }
}

export function useQrController({ domain, googlePlaceId }: { domain: string; googlePlaceId: string | null }) {
  const form = useForm<QrFormValues>({
    resolver: zodResolver(qrFormSchema),
    defaultValues: { size: "1024", target: "menu" },
  });
  const size = Number(useWatch({ control: form.control, name: "size" }));
  const target = useWatch({ control: form.control, name: "target" });
  const canGenerate = target !== "reviews" || Boolean(googlePlaceId);
  const url = canGenerate ? buildQrUrl({ domain, googlePlaceId, target }) : null;
  const fileBase = buildQrFileBase({ domain, target });
  const copy = () =>
    runAction(async () => {
      if (!url) return;
      await navigator.clipboard.writeText(url);
      toast.success(i18n.t("qr___URL copiada."));
    });
  const download = (format: "png" | "svg") =>
    runAction(async () => {
      if (!url) return;
      await downloadQr({ fileBase, format, size, url });
    });
  return { canGenerate, copy, download, form, target, url };
}
