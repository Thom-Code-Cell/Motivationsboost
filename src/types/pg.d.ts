declare module 'pg' {
  export class Pool {
    constructor(config?: { connectionString?: string; max?: number; connectionTimeoutMillis?: number });
    query(text: string, values?: unknown[]): Promise<{ rows: Record<string, unknown>[]; rowCount: number | null }>;
    end(): Promise<void>;
  }
}
