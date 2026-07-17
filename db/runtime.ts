type SqlValue = null | number | bigint | string | Uint8Array;

type RunResult = {
  success: true;
  meta: {
    changes: number;
    last_row_id: number;
  };
};

export interface OperationStatement {
  bind(...values: unknown[]): OperationStatement;
  run(): Promise<RunResult>;
  first<T extends Record<string, unknown> = Record<string, unknown>>(): Promise<T | null>;
  all<T extends Record<string, unknown> = Record<string, unknown>>(): Promise<{
    success: true;
    results: T[];
  }>;
}

export interface OperationDatabase {
  prepare(sql: string): OperationStatement;
  batch(statements: OperationStatement[]): Promise<RunResult[]>;
}

type NodeRunResult = {
  changes: number | bigint;
  lastInsertRowid: number | bigint;
};

type NodeStatement = {
  all(...values: SqlValue[]): Record<string, unknown>[];
  get(...values: SqlValue[]): Record<string, unknown> | undefined;
  run(...values: SqlValue[]): NodeRunResult;
};

type NodeDatabase = {
  exec(sql: string): void;
  prepare(sql: string): NodeStatement;
};

type NodeProcess = {
  env?: Record<string, string | undefined>;
  versions?: { node?: string };
};

function nodeProcess() {
  return (globalThis as typeof globalThis & { process?: NodeProcess }).process;
}

function toSqlValue(value: unknown): SqlValue {
  if (value == null) return null;
  if (typeof value === "string" || typeof value === "number" || typeof value === "bigint") return value;
  if (typeof value === "boolean") return value ? 1 : 0;
  if (value instanceof Uint8Array) return value;
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

class NodeOperationStatement implements OperationStatement {
  private values: SqlValue[] = [];

  constructor(
    private readonly connection: NodeDatabase,
    private readonly sql: string,
  ) {}

  bind(...values: unknown[]) {
    this.values = values.map(toSqlValue);
    return this;
  }

  async run(): Promise<RunResult> {
    const result = this.connection.prepare(this.sql).run(...this.values);
    return {
      success: true,
      meta: {
        changes: Number(result.changes),
        last_row_id: Number(result.lastInsertRowid),
      },
    };
  }

  async first<T extends Record<string, unknown> = Record<string, unknown>>() {
    return (this.connection.prepare(this.sql).get(...this.values) as T | undefined) ?? null;
  }

  async all<T extends Record<string, unknown> = Record<string, unknown>>() {
    return {
      success: true as const,
      results: this.connection.prepare(this.sql).all(...this.values) as T[],
    };
  }
}

class NodeOperationDatabase implements OperationDatabase {
  constructor(private readonly connection: NodeDatabase) {
    this.connection.exec("PRAGMA foreign_keys = ON");
  }

  prepare(sql: string) {
    return new NodeOperationStatement(this.connection, sql);
  }

  async batch(statements: OperationStatement[]) {
    const results: RunResult[] = [];
    this.connection.exec("BEGIN IMMEDIATE");
    try {
      for (const statement of statements) results.push(await statement.run());
      this.connection.exec("COMMIT");
      return results;
    } catch (error) {
      this.connection.exec("ROLLBACK");
      throw error;
    }
  }
}

let databasePromise: Promise<OperationDatabase> | null = null;

async function cloudflareDatabase() {
  try {
    const { env } = await import("cloudflare:workers");
    if (env.DB) return env.DB as unknown as OperationDatabase;
  } catch (error) {
    if (!nodeProcess()?.versions?.node) throw error;
  }
  return null;
}

function sqlitePath() {
  const environment = nodeProcess()?.env;
  const explicitPath = environment?.SQLITE_PATH?.trim();
  if (explicitPath) return explicitPath;

  const volumePath = environment?.RAILWAY_VOLUME_MOUNT_PATH?.trim().replace(/\/$/, "");
  if (volumePath) return `${volumePath}/afterschool-platform.sqlite`;

  return "/tmp/afterschool-platform.sqlite";
}

async function nodeDatabase() {
  const sqliteModuleName = "node:sqlite";
  const fsModuleName = "node:fs";
  const sqliteModule = await import(/* @vite-ignore */ sqliteModuleName) as {
    DatabaseSync: new (path: string) => NodeDatabase;
  };
  const fsModule = await import(/* @vite-ignore */ fsModuleName) as {
    mkdirSync(path: string, options: { recursive: true }): void;
  };
  const path = sqlitePath();
  const separator = path.lastIndexOf("/");
  if (separator > 0) fsModule.mkdirSync(path.slice(0, separator), { recursive: true });
  return new NodeOperationDatabase(new sqliteModule.DatabaseSync(path));
}

export async function getOperationDatabase() {
  if (!databasePromise) {
    databasePromise = (async () => {
      const cloudflare = await cloudflareDatabase();
      if (cloudflare) return cloudflare;
      if (nodeProcess()?.versions?.node) return nodeDatabase();
      throw new Error("운영 데이터베이스 연결을 확인해 주세요.");
    })().catch((error) => {
      databasePromise = null;
      throw error;
    });
  }
  return databasePromise;
}
