import { useEffect, useRef, useState } from "react";

import { transferImageDrafts } from "./transfer-image-drafts";

import type { ImageDraftGroup } from "./transfer-image-drafts";
import type { FileOperation } from "../components/forms/file-operation-progress";

export function useImageUploads() {
  const [operation, setOperation] = useState<FileOperation>();
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  const transfer = (input: { branchId: string; groups: ImageDraftGroup[] }) => {
    controller.current = new AbortController();
    return transferImageDrafts({ ...input, signal: controller.current.signal, onProgress: setOperation });
  };
  const clear = () => {
    controller.current = null;
    setOperation(undefined);
  };
  return { transfer, operation, clear };
}
