import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { trpc } from "~/lib/trpc";
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
  const scheduleFieldArray = useFieldArray({ control: form.control, name: "schedules" });
  const { fields } = scheduleFieldArray;
  const schedules = useWatch({ control: form.control, name: "schedules" });
  const save = useMutation(getSaveBranchMutationOptions({ branchId, queryClient, trpc }));
  const logo = useImageDraft(settings.logoUrl);
  const gallery = useImageGalleryDraft(settings.photos.map((photo) => photo.url));
  const uploads = useImageUploads();
  const imageSave = useImageSave();
  const submit = form.handleSubmit(async (values) => {
    const succeeded = await imageSave.run(async () => {
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
    if (succeeded) toast.success("Datos guardados.");
  });
  function setScheduleEnabled(dayOfWeek: number, enabled: boolean) {
    const indexes = schedules
      .map((row, index) => (row.dayOfWeek === dayOfWeek ? index : -1))
      .filter((index) => index >= 0);
    if (enabled) {
      if (indexes.length === 0 && fields.length < 21) {
        scheduleFieldArray.append({ dayOfWeek, open: "12:00", close: "23:00" });
      }
      return;
    }
    scheduleFieldArray.remove(indexes.toReversed());
  }
  function addSchedule(dayOfWeek: number) {
    if (fields.length >= 21) return;
    let lastIndex = -1;
    for (const [index, row] of schedules.entries()) {
      if (row.dayOfWeek === dayOfWeek) lastIndex = index;
    }
    scheduleFieldArray.insert(lastIndex + 1, { dayOfWeek, open: "12:00", close: "23:00" });
  }
  return {
    addSchedule,
    fields,
    form,
    gallery,
    logo,
    schedules,
    settings,
    setResolvePending,
    operation: uploads.operation,
    pending: imageSave.pending || save.isPending || resolvePending,
    removeSchedule: scheduleFieldArray.remove,
    setScheduleEnabled,
    submit,
  };
}
