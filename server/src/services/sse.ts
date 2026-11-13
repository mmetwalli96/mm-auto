import { pgPool, createPgClient } from '@clients';
import { createSnapshot, isTable } from '@models';
import type { Notification } from 'pg';
import type { Response } from 'express';
import type { TableChangeNotification } from '@/types/sse';


const CHANNEL = 'table_update';
const RECONNECT_MS = 2000;
const clients = new Set<Response>();

export function send(res: Response, event: string, data: unknown): void {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

export function broadcast(event: string, data: unknown): void {
    for (const res of clients) send(res, event, data);
}

export function addClient(res: Response): () => void {
    clients.add(res);
    return () => clients.delete(res);
}

async function onNotification(msg: Notification): Promise<void> {
    try {
        console.log('Received notification:', msg);
        if (!msg.payload) return;
        const change = JSON.parse(msg.payload) as TableChangeNotification;
        if (!isTable(change.table)) return;

        let row: unknown = change.row ?? null;

        if (row === null && change.op !== 'DELETE') {
            const result = await pgPool.query<{ row: unknown }>(
                `SELECT row_to_json(t) AS row FROM ${change.table} t WHERE t.id = $1`,
                [change.id],
            );
            const fetched = result.rows[0];
            if (!fetched) return;
            row = fetched.row;
        }

        broadcast(change.table, { op: change.op, id: change.id, row });
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

    pgClient.on('error', fail);
    pgClient.on('end', () => fail());
    pgClient.on('notification', onNotification);

    try {
        await pgClient.connect();
        await pgClient.query(`LISTEN ${CHANNEL}`);
        broadcast('snapshot', await createSnapshot());
    } catch (err) {
        fail(err as Error);
    }
}

export function runListenToTableChanges(): void {
    void listenToTableChanges((error) => {
        if (error) console.error('listener connection lost for detecting table changes::', error.message);
        setTimeout(runListenToTableChanges, RECONNECT_MS);
    });
}
