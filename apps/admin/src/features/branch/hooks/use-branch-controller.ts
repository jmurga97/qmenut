import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";

import { trpc } from "~/lib/trpc";
import { useMutationFeedback } from "~/shared/hooks/use-mutation-feedback";
import { useImageDraft, useImageGalleryDraft } from "~/shared/images/use-image-drafts";
import { useImageSave } from "~/shared/images/use-image-save";
import { useImageUploads } from "~/shared/images/use-image-uploads";

import { getBranchQueryOptions, getSaveBranchMutationOptions } from "../api";
import { toBranchFormValues, toBranchInput } from "../mappers";
import { branchFormSchema } from "../types";

import type { BranchFormValues } from "../types";

export function useBranchController(branchId: string) {
  const queryClient = useQueryClient();
  const [resolvePending, setResolvePending] = useState(false);
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
  const uploads = useImageUploads();
  const imageSave = useImageSave();
  const submit = form.handleSubmit(async (values) => {
    await imageSave.run(async () => {
      const [preparedLogo, ...preparedPhotos] = await uploads.transfer({
        branchId,
        groups: [
          { purpose: "branchLogo", drafts: [logo.draft], updateDraft: logo.update },
          { purpose: "branchPhoto", drafts: gallery.drafts, updateDraft: gallery.update },
        ],
      });
      if (!preparedLogo) throw new Error("No se pudo preparar el logo.");
      const data = toBranchInput({ branchId, settings, values, logo: preparedLogo, photos: preparedPhotos });
      const imageChanges = {
        logo: preparedLogo.imageChange,
        gallery: gallery.changed
          ? preparedPhotos.map((photo, position) =>
              photo.uploadId ? { uploadId: photo.uploadId, position } : { url: photo.imageUrl ?? undefined, position },
            )
          : undefined,
      };
      const operationId = imageSave.operationIdFor({ ...data, imageChanges });
      await save.mutateAsync({ ...data, imageChanges, operationId });
      void queryClient.invalidateQueries({ queryKey: trpc.admin.images.assignments.pathKey() });
      logo.accept();
      gallery.accept();
    }, uploads.clear);
  });
  const feedback = useMutationFeedback(save, "Datos guardados.");
  return {
    fields,
    form,
    gallery,
    logo,
    schedules,
    settings,
    setResolvePending,
    feedback: { ...feedback, error: imageSave.error ?? save.error },
    operation: uploads.operation,
    pending: imageSave.pending || save.isPending || resolvePending,
    submit,
  };
}
