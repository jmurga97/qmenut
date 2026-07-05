import { registerQmComponents } from "@qmenut/ui";
import { useEffect } from "react";

export function useRegisterQmComponents(): void {
  useEffect(() => {
    registerQmComponents();
  }, []);
}
