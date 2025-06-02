/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_STRIPE_PUBLIC_KEY: string;
  readonly VITE_STRIPE_SINGLE_UPLOAD_PRICE_ID: string;
  readonly VITE_STRIPE_SUBSCRIPTION_PRICE_ID: string;
  readonly VITE_PICAOS_API_URL: string;
  readonly VITE_PICAOS_API_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module "*.svg" {
  const content: string;
  export default content;
}
