import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { useShallow } from "zustand/react/shallow";

import { MOBILE_MEDIA_QUERY } from "@utils/media-queries";
import { useMediaQuery } from "@utils/use-media-query";

interface ShellStoreState {
  isSidebarOpenDesktop: boolean;
  isSidebarOpenMobile: boolean;
}

interface ShellStoreActions {
  setSidebarOpenDesktop: (isOpen: boolean) => void;
  setSidebarOpenMobile: (isOpen: boolean) => void;
}

type ShellStore = ShellStoreState & ShellStoreActions;

const SHELL_STORAGE_KEY = "qmenut-admin-shell";

const useShellStore = create<ShellStore>()(
  persist(
    (set, get) => ({
      isSidebarOpenDesktop: true,
      isSidebarOpenMobile: false,
      setSidebarOpenDesktop: (isOpen) => {
        if (get().isSidebarOpenDesktop === isOpen) {
          return;
        }

        set({ isSidebarOpenDesktop: isOpen });
      },
      setSidebarOpenMobile: (isOpen) => {
        if (get().isSidebarOpenMobile === isOpen) {
          return;
        }

        set({ isSidebarOpenMobile: isOpen });
      },
    }),
    {
      name: SHELL_STORAGE_KEY,
      partialize: (state) => ({
        isSidebarOpenDesktop: state.isSidebarOpenDesktop,
      }),
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

export function useShellMobile() {
  return useMediaQuery(MOBILE_MEDIA_QUERY);
}

export function useSidebarOpen() {
  const isMobile = useShellMobile();
  const { isSidebarOpenDesktop, isSidebarOpenMobile } = useShellStore(
    useShallow((state) => ({
      isSidebarOpenDesktop: state.isSidebarOpenDesktop,
      isSidebarOpenMobile: state.isSidebarOpenMobile,
    })),
  );

  return isMobile ? isSidebarOpenMobile : isSidebarOpenDesktop;
}

export function useShellActions() {
  const isMobile = useShellMobile();
  const { setSidebarOpenDesktop, setSidebarOpenMobile } = useShellStore(
    useShallow((state) => ({
      setSidebarOpenDesktop: state.setSidebarOpenDesktop,
      setSidebarOpenMobile: state.setSidebarOpenMobile,
    })),
  );

  return {
    closeSidebar: () => {
      if (isMobile) {
        setSidebarOpenMobile(false);
        return;
      }

      setSidebarOpenDesktop(false);
    },
    setSidebarOpen: (isOpen: boolean) => {
      if (isMobile) {
        setSidebarOpenMobile(isOpen);
        return;
      }

      setSidebarOpenDesktop(isOpen);
    },
    toggleSidebar: () => {
      if (isMobile) {
        setSidebarOpenMobile(!useShellStore.getState().isSidebarOpenMobile);
        return;
      }

      setSidebarOpenDesktop(!useShellStore.getState().isSidebarOpenDesktop);
    },
  };
}
