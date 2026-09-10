import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

interface LanguageStore {
  selectedLanguageCode: string | null;
  setSelectedLanguageCode: (languageCode: string) => void;
}
const LANGUAGE_STORAGE_KEY = "qmenut-admin-language";
export const useLanguageStore = create<LanguageStore>()(
  persist(
    (set) => ({
      selectedLanguageCode: null,
      setSelectedLanguageCode: (selectedLanguageCode) => set({ selectedLanguageCode }),
    }),
    {
      name: LANGUAGE_STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
