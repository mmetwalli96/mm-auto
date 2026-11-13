import { TABLES } from '@/types/table-changes';
import { Snapshot } from "@/types/sse";
import type { TableName, IncidentHistoryRow, ProgressTrackerRow } from '@/types/table-changes';
import { pgPool } from '@clients';

export function isTable(name: string): name is TableName {
  return (TABLES as readonly string[]).includes(name);
}

async function getRows<Row>(table: TableName): Promise<Row[]> {
  const { rows } = await pgPool.query<{ rows: Row[] }>(
    `SELECT coalesce(json_agg(t ORDER BY t.id), '[]'::json) AS rows FROM ${table} t`,
  );
  return rows[0]?.rows ?? [];
}

export async function createSnapshot(): Promise<Snapshot> {
  return {
    incident_history: await getRows<IncidentHistoryRow>('incident_history'),
    progress_tracker: await getRows<ProgressTrackerRow>('progress_tracker'),
  };
}