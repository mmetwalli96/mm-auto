import { pgPool, createPgClient } from '@clients';
import { createSnapshot, isTable } from '@models';
import { sseConfig } from '@config';
import { broadcast } from "@utils";

import type { Notification } from 'pg';
import type { Response } from 'express';
import type { TableChangeNotification } from '@/types/sse';

export const tableChangesClients = new Set<Response>();

async function onNotification(msg: Notification): Promise<void> {
    try {
        if (!msg.payload) return;
        const change = JSON.parse(msg.payload) as TableChangeNotification;
        if (!isTable(change.table_name)) return;

        let row: unknown = change.record ?? null;

        if (row === null && change.operation !== 'DELETE') {
            const result = await pgPool.query<{ row: unknown }>(
                `SELECT row_to_json(t) AS row FROM ${change.table_name} t WHERE t.id = $1`,
                [change.id],
            );
            const fetched = result.rows[0];
            if (!fetched) return;
            row = fetched.row;
        }

        broadcast(change.table_name, { operation: change.operation, id: change.id, row }, tableChangesClients);
    } catch (error) {
        console.error('Failed to handle Table Change Notification:', error);
    }
}

async function listenToTableChanges(onLost: (err?: Error) => void): Promise<void> {
    const pgClient = createPgClient();
    let lost = false;
    const fail = (err?: Error) => {
        if (lost) return;
        lost = true;
        pgClient.end().catch(() => { });
        onLost(err);
    };

    pgClient.on('error', (err) => fail(err));
    pgClient.on('end', () => fail());
    pgClient.on('notification', onNotification);

    try {
        await pgClient.connect();
        await pgClient.query(`LISTEN ${sseConfig.tableUpdateChannel}`);
        broadcast('snapshot', await createSnapshot(), tableChangesClients);
    } catch (err) {
        fail(err as Error);
    }
}

export function runListenToTableChanges(): void {
    void listenToTableChanges((error) => {
        if (error) console.error('listener connection lost for detecting table changes::', error.message);
        setTimeout(runListenToTableChanges, sseConfig.reconnect);
    });
}
