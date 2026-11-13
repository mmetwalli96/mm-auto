import type { IncidentHistoryRow, ProgressTrackerRow } from '@/types/table-changes';
import type { ClientConfig } from 'pg';
type Operation = 'INSERT' | 'UPDATE' | 'DELETE';

export interface Snapshot {
  incident_history: IncidentHistoryRow[];
  progress_tracker: ProgressTrackerRow[];
}

export interface ChangeEvent<Row = IncidentHistoryRow | ProgressTrackerRow> {
  op: Operation;
  id: number;
  row: Row | null;
}

export interface TableChangeNotification {
  table: string;
  op: Operation;
  id: number;
  row?: Record<string, unknown>; // omitted when the row was too large for NOTIFY
}

export interface Options {
  path?: string;
  connection?: ClientConfig;
}