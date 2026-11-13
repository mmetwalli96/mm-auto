export interface IncidentHistoryRow {
  id: number;
  incident: string;
  interruption: string;
  occurrence_time: string;
  description: string;
  resolution_date: string | null;
  status: 'In Progress' | 'Resolved';
}

export interface ProgressTrackerRow {
  id: number;
  incident: string;
  event_time: string;
  event_description: string;
  uri: string | null;
}

export const TABLES = ['incident_history', 'progress_tracker'] as const;
export type TableName = (typeof TABLES)[number];

