import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useFieldArray, useForm, useWatch } from "react-hook-form";

import { trpc } from "~/lib/trpc";
import { useMutationFeedback } from "~/shared/hooks/use-mutation-feedback";
import { isDraftBusy } from "~/shared/images/image-draft";
import { useImageDraft, useImageGalleryDraft } from "~/shared/images/use-image-drafts";
import { useImageSave } from "~/shared/images/use-image-save";
import { usePrepareImageDrafts } from "~/shared/images/use-image-uploads";

import { getBranchQueryOptions, getSaveBranchMutationOptions } from "../api";
import { toBranchFormValues, toBranchInput } from "../mappers";
import { branchFormSchema } from "../types";

import type { BranchFormValues } from "../types";

export function useBranchController(branchId: string) {
  const queryClient = useQueryClient();
  const { data: settings } = useSuspenseQuery(getBranchQueryOptions({ branchId, trpc }));
  const form = useForm<BranchFormValues>({
    resolver: zodResolver(branchFormSchema),
    defaultValues: toBranchFormValues(settings),
  });
  const fields = useFieldArray({ control: form.control, name: "schedules" }).fields;
  const schedules = useWatch({ control: form.control, name: "schedules" });
  const save = useMutation(getSaveBranchMutationOptions({ branchId, queryClient, trpc }));
  const logo = useImageDraft(settings.logoUrl);
  const gallery = useImageGalleryDraft(settings.photos.map((photo) => photo.url));
  const { prepare } = usePrepareImageDrafts();
  const imageSave = useImageSave();
  const submit = form.handleSubmit((values) =>
    imageSave.run(async () => {
      const [preparedLogo] = await prepare({
        branchId,
        purpose: "branchLogo",
        drafts: [logo.draft],
        updateDraft: logo.update,
      });
      const preparedPhotos = await prepare({
        branchId,
        purpose: "branchPhoto",
        drafts: gallery.drafts,
        updateDraft: gallery.update,
        concurrency: 3,
      });
      if (!preparedLogo) throw new Error("No se pudo preparar el logo.");
      await save.mutateAsync(
        toBranchInput({
          branchId,
          settings,
          values,
          logo: preparedLogo,
          photos: preparedPhotos,
        }),
      );
    }),
  );
  const uploading = isDraftBusy(logo.draft) || gallery.drafts.some((draft) => isDraftBusy(draft));
  const feedback = useMutationFeedback(save, "Cambios guardados.");
  return {
    fields,
    form,
    gallery,
    logo,
    schedules,
    settings,
    feedback: { ...feedback, error: imageSave.error ?? save.error },
    pending: imageSave.pending || save.isPending || uploading,
    submit,
  };
}
