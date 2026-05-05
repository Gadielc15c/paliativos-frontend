/// <reference types="vite/client" />

interface ImportMeta {
  readonly env: {
    readonly VITE_API_BASE_URL?: string;
    readonly VITE_DEV_EMAIL?: string;
    readonly VITE_DEV_PASSWORD?: string;
    readonly VITE_DEV_AUTO_LOGIN?: string;
  };
}
