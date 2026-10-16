export interface Bindings {
  DB: D1Database;
  CACHE: KVNamespace;
  ASSETS: Fetcher;
  API_KEY?: string;
  AI_PROVIDER?: string;
  AI_BASE_URL?: string;
  AI_MODEL?: string;
}

export interface AppEnv {
  Bindings: Bindings;
}
