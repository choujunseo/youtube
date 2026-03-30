/**
 * Supabase Edge Functions(Deno) 런타임용 최소 타입 정의.
 */
export {};

declare global {
  /** Edge Runtime HTTP client (mTLS 등) */
  interface TossEdgeHttpClient {
    close(): void;
  }

  const Deno: {
    env: {
      get(key: string): string | undefined;
    };
    serve(handler: (req: Request) => Response | Promise<Response>): void;
    createHttpClient(options: {
      cert?: string;
      key?: string;
      caCerts?: string[];
    }): TossEdgeHttpClient;
  };

  interface RequestInit {
    client?: TossEdgeHttpClient;
  }
}
