export interface RequestInitLike {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
  signal?: AbortSignal;
}

export interface ResponseLike {
  ok: boolean;
  status: number;
  headers: { get(name: string): string | null };
  text(): Promise<string>;
  json(): Promise<unknown>;
}

/** The subset of `fetch` the app relies on. The mock platform implements exactly this. */
export type FetchLike = (url: string, init?: RequestInitLike) => Promise<ResponseLike>;
