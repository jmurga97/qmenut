import { useCallback, useEffect, useRef, useState } from "react";

import {
  createImageDraft,
  replaceImageDraftFile,
  retryImageDraft,
  revokeImageDraftPreview,
  validateImageFile,
} from "./image-draft";

import type { ImageDraft } from "./image-draft";

function useImageDraftCollection(createInitialDrafts: () => ImageDraft[]) {
  const [drafts, setDrafts] = useState(createInitialDrafts);
  const draftsRef = useRef(drafts);
  draftsRef.current = drafts;

  useEffect(
    () => () => {
      for (const draft of draftsRef.current) revokeImageDraftPreview(draft);
    },
    [],
  );

  const replace = useCallback((id: string, file: File) => {
    setDrafts((current) => current.map((draft) => (draft.id === id ? replaceImageDraftFile({ draft, file }) : draft)));
  }, []);

  const remove = useCallback((id: string) => {
    setDrafts((current) => {
      const removed = current.find((draft) => draft.id === id);
      if (removed) revokeImageDraftPreview(removed);
      return current.filter((draft) => draft.id !== id);
    });
  }, []);

  const reset = useCallback((id: string) => {
    setDrafts((current) =>
      current.map((draft) => {
        if (draft.id !== id) return draft;
        revokeImageDraftPreview(draft);
        return createImageDraft({ imageUrl: null });
      }),
    );
  }, []);

  const retry = useCallback((id: string) => {
    setDrafts((current) => current.map((draft) => (draft.id === id ? retryImageDraft(draft) : draft)));
  }, []);

  const update = useCallback((id: string, patch: Partial<ImageDraft>) => {
    setDrafts((current) => current.map((draft) => (draft.id === id ? { ...draft, ...patch } : draft)));
  }, []);

  return { drafts, draftsRef, remove, replace, reset, retry, setDrafts, update };
}

export function useImageDraft(initialUrl: string | null) {
  const {
    drafts,
    replace,
    reset,
    retry: retryDraft,
    update,
  } = useImageDraftCollection(() => [createImageDraft({ imageUrl: initialUrl })]);
  const draft = drafts[0];
  if (!draft) throw new Error("No se pudo inicializar el borrador de imagen.");

  const remove = useCallback(() => reset(draft.id), [draft.id, reset]);
  const retry = useCallback(() => retryDraft(draft.id), [draft.id, retryDraft]);
  const selectFile = useCallback((file: File) => replace(draft.id, file), [draft.id, replace]);

  return { draft, remove, retry, selectFile, update };
}

export function useImageGalleryDraft(initialUrls: string[], maximum = 20) {
  const { drafts, draftsRef, remove, replace, retry, setDrafts, update } = useImageDraftCollection(() =>
    initialUrls.map((imageUrl) => createImageDraft({ imageUrl })),
  );
  const [error, setError] = useState<string>();

  const addFiles = useCallback(
    (files: File[]) => {
      const remaining = maximum - draftsRef.current.length;
      if (files.length > remaining) {
        setError(`La galería admite hasta ${maximum} imágenes.`);
        return;
      }
      const validationError = files.map((file) => validateImageFile(file)).find(Boolean);
      if (validationError) {
        setError(validationError);
        return;
      }
      setError(undefined);
      setDrafts((current) => [...current, ...files.map((file) => createImageDraft({ file, imageUrl: null }))]);
    },
    [draftsRef, maximum, setDrafts],
  );

  const move = useCallback(
    (id: string, direction: -1 | 1) => {
      setDrafts((current) => {
        const index = current.findIndex((draft) => draft.id === id);
        const target = index + direction;
        if (index === -1 || target < 0 || target >= current.length) return current;
        const next = [...current];
        const [draft] = next.splice(index, 1);
        if (!draft) return current;
        next.splice(target, 0, draft);
        return next;
      });
    },
    [setDrafts],
  );

  return {
    addFiles,
    drafts,
    error,
    move,
    remove,
    replace,
    retry,
    update,
  };
}
