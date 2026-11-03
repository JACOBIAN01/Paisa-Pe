export interface HttpRequest {
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: string;
}

export interface HttpResponseInfo {
  request: HttpRequest;
  status: number;
  ok: boolean;
  durationMs: number;
}

export interface Interceptor {
  /** May return a modified copy of the request. */
  request?(request: HttpRequest): HttpRequest | Promise<HttpRequest>;
  /** Observes every response, successful or not. Errors thrown here are ignored. */
  response?(info: HttpResponseInfo): void | Promise<void>;
}

export class InterceptorChain {
  private readonly items: Interceptor[] = [];

  use(interceptor: Interceptor): () => void {
    this.items.push(interceptor);
    return () => {
      const index = this.items.indexOf(interceptor);
      if (index >= 0) this.items.splice(index, 1);
    };
  }

  async applyRequest(request: HttpRequest): Promise<HttpRequest> {
    let current = request;
    for (const item of [...this.items]) {
      if (item.request) current = await item.request(current);
    }
    return current;
  }

  async notifyResponse(info: HttpResponseInfo): Promise<void> {
    for (const item of [...this.items]) {
      try {
        await item.response?.(info);
      } catch {
        // observers must never break the request
      }
    }
  }
}
