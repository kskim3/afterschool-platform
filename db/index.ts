import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";
import { getOperationDatabase } from "./runtime";

export async function getDb() {
  return drizzle(await getOperationDatabase() as unknown as D1Database, { schema });
}
