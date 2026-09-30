import 'server-only';
import type { SqlParameter } from '@aws-sdk/client-rds-data';
import outputs from '../aws/outputs.json';

/**
 * Copied from snowai-app/model (from snowai-app/forms, from snowai-app/points); change one, change the others.
 * The family's database over the RDS Data API, as the compute role — the way
 * snowai-app/ask's lib/calls.ts reaches it. One statement, or several in one
 * transaction.
 */
const target = () => ({
  resourceArn: process.env.DATABASE_CLUSTER_ARN || outputs.database.clusterArn,
  secretArn: process.env.DATABASE_SECRET_ARN || outputs.database.secretArn,
  database: process.env.DATABASE_NAME || outputs.database.name,
});

let client: import('@aws-sdk/client-rds-data').RDSDataClient | null = null;
async function rds() {
  const m = await import('@aws-sdk/client-rds-data');
  client ??= new m.RDSDataClient({ region: outputs.region });
  return { c: client, m };
}

export async function run<R = Record<string, unknown>>(sql: string, parameters: SqlParameter[] = [], transactionId?: string): Promise<R[]> {
  const { c, m } = await rds();
  const out = await c.send(new m.ExecuteStatementCommand({ ...target(), sql, parameters, transactionId, formatRecordsAs: 'JSON' }));
  return out.formattedRecords ? (JSON.parse(out.formattedRecords) as R[]) : [];
}

/** Run `work` inside one transaction; commit if it returns, roll back if it throws. */
export async function inTransaction<T>(work: (tx: string) => Promise<T>): Promise<T> {
  const { c, m } = await rds();
  const { transactionId } = await c.send(new m.BeginTransactionCommand(target()));
  if (!transactionId) throw new Error('the database did not open a transaction');
  try {
    const result = await work(transactionId);
    await c.send(new m.CommitTransactionCommand({ resourceArn: target().resourceArn, secretArn: target().secretArn, transactionId }));
    return result;
  } catch (e) {
    await c.send(new m.RollbackTransactionCommand({ resourceArn: target().resourceArn, secretArn: target().secretArn, transactionId })).catch(() => {});
    throw e;
  }
}

export const text = (name: string, value: string | null): SqlParameter =>
  value === null ? { name, value: { isNull: true } } : { name, value: { stringValue: value } };
export const int = (name: string, value: number): SqlParameter => ({ name, value: { longValue: Math.round(value) } });
export const bool = (name: string, value: boolean): SqlParameter => ({ name, value: { booleanValue: value } });
