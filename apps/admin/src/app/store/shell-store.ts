import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { MOBILE_MEDIA_QUERY } from "~/shared/hooks/media-queries";
import { useMediaQuery } from "~/shared/hooks/use-media-query";

interface ShellStore {
  isSidebarOpenDesktop: boolean;
  isSidebarOpenMobile: boolean;
  setSidebarOpenDesktop: (isOpen: boolean) => void;
  setSidebarOpenMobile: (isOpen: boolean) => void;
}
const SHELL_STORAGE_KEY = "qmenut-admin-shell";
const useShellStore = create<ShellStore>()(
  persist(
    (set) => ({
      isSidebarOpenDesktop: true,
      isSidebarOpenMobile: false,
      setSidebarOpenDesktop: (isSidebarOpenDesktop) => set({ isSidebarOpenDesktop }),
      setSidebarOpenMobile: (isSidebarOpenMobile) => set({ isSidebarOpenMobile }),
    }),
    {
      name: SHELL_STORAGE_KEY,
      partialize: ({ isSidebarOpenDesktop }) => ({ isSidebarOpenDesktop }),
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
export function useShellMobile() {
  return useMediaQuery(MOBILE_MEDIA_QUERY);
}
export function useSidebarOpen() {
  const isMobile = useShellMobile();
  return useShellStore((state) => (isMobile ? state.isSidebarOpenMobile : state.isSidebarOpenDesktop));
}
export function useShellActions() {
  const isMobile = useShellMobile();
  const setSidebarOpen = useShellStore((state) =>
    isMobile ? state.setSidebarOpenMobile : state.setSidebarOpenDesktop,
  );
  return {
    closeSidebar: () => setSidebarOpen(false),
    setSidebarOpen,
    toggleSidebar: () => {
      const state = useShellStore.getState();
      setSidebarOpen(isMobile ? !state.isSidebarOpenMobile : !state.isSidebarOpenDesktop);
    },
  };
}
