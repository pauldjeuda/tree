/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** URL de base de l'API (par défaut /api/v1, via le proxy Vite en développement). */
  readonly VITE_API_URL?: string;
  readonly VITE_DEV_API_TARGET?: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
