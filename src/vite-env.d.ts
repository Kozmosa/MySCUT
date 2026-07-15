/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_UPDATE_MANIFEST_URL?: string
  readonly VITE_UPDATE_PROVIDER_ORDER?: string
}

declare const __APP_VERSION__: string
declare const __PDF_LOCAL_CMAP_ENABLED__: boolean
declare const __PWA_ENABLED__: boolean
