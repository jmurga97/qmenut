/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ADMIN_ORIGIN?: string;
  readonly VITE_LANDING_ORIGIN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
