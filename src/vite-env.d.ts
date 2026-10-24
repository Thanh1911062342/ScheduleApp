/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Địa chỉ backend khi deploy; nếu bỏ trống thì dùng proxy dev `/api/v1`. */
  readonly VITE_API_BASE_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}