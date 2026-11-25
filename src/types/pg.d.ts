declare module 'pg' {
  type QueryResult<Row> = { rows: Row[]; rowCount: number | null };
  interface PoolClient {
    query<Row = Record<string, unknown>>(text: string, values?: unknown[]): Promise<QueryResult<Row>>;
    release(): void;
  }
  export class Pool {
    constructor(config?: { connectionString?: string; max?: number; connectionTimeoutMillis?: number; idleTimeoutMillis?: number; options?: string });
    connect(): Promise<PoolClient>;
    query<Row = Record<string, unknown>>(text: string, values?: unknown[]): Promise<QueryResult<Row>>;
    end(): Promise<void>;
  }
}
