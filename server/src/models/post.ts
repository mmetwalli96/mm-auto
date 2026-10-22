import { pgClient, bucket, neo4jGraph } from "@clients";
import { execFile } from "child_process";
import { promisify } from "util";
import path from "path";
import { dbConfig } from "@/config";
import type { GetFilesResponse } from "@google-cloud/storage";

const execFileAsync = promisify(execFile);
const DB_DIR = path.join(import.meta.dirname, "..", "..", "db", "postgres");

interface ResetState {
    success: boolean;
    error?: string;
}

export const resetPg = async (): Promise<ResetState> => {
    const QUERY = `
                    BEGIN;
                    TRUNCATE progress_tracker, incident_history, interruption_codes RESTART IDENTITY CASCADE;
                    DROP TABLE IF EXISTS progress_tracker, incident_history, interruption_codes CASCADE;
                    COMMIT;
                `;

    try {
        await pgClient.query(QUERY);
        const { stdout, stderr } = await execFileAsync(
            "psql",
            [
                "-v", "ON_ERROR_STOP=1",
                "--single-transaction",
                "-f", path.join(DB_DIR, "schema.sql"),
                "-f", path.join(DB_DIR, "seed.sql"),
            ],
            {
                env: {
                    ...process.env,
                    PGHOST: dbConfig.postgres.host,
                    PGPORT: String(dbConfig.postgres.port),
                    PGUSER: dbConfig.postgres.userName,
                    PGPASSWORD: dbConfig.postgres.password,
                    PGDATABASE: dbConfig.postgres.database,
                    PGSSLMODE: dbConfig.postgres.ssl === true ? "require" : "disable",
                },
                maxBuffer: 10 * 1024 * 1024,
            }
        );
        if (stderr) console.warn(stderr);
        console.log(stdout);
        return { success: true };

    } catch (error) {
        console.error('Error resetting PostgreSQL:', error);
        await pgClient.query('ROLLBACK');
        return { success: false, error: (error as Error).message };
    }

};

export const resetNeo4j = async (): Promise<ResetState> => {
    var urls: string[] = [];
    try {
        await neo4jGraph.query(`
            MATCH (n)
            CALL (n) { DETACH DELETE n } IN TRANSACTIONS OF 10000 ROWS;
        `);
        const files: GetFilesResponse = await bucket.getFiles();
        const fileNames = files[0].map(file => !["interruption_codes.csv", "progress_tracker.csv", "incident_history.csv"].includes(file.name) ? file.name : null!).filter(Boolean);
        for (const fileName of fileNames) {
            const file = bucket.file(fileName);
            const url = await file.getSignedUrl({
                version: 'v4',
                action: 'read',
                expires: Date.now() + 5 * 60 * 1000
            });
            console.log(`Generated signed URL for file: ${fileName}, URL: ${url}`);
            urls.push(url[0]);
        }
        return { success: true };
    } catch (error) {
        console.error('Error resetting Neo4j:', error);
        return { success: false, error: (error as Error).message };
    }
};