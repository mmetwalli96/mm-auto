import { pgClient, bucket, neo4jGraph } from "@clients";
import { execFile } from "child_process";
import { promisify } from "util";
import path from "path";
import { dbConfig } from "@/config";
import type { GetFilesResponse } from "@google-cloud/storage";
import fs from "fs/promises";

const execFileAsync = promisify(execFile);
const DB_DIR = path.join(import.meta.dirname, "..", "..", "db");

interface ResetState {
    success: boolean;
    error?: string;
}

interface SignedFile {
    name: string;
    url: string;
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
                "-f", path.join(DB_DIR, "postgres", "schema.sql"),
                "-f", path.join(DB_DIR, "postgres", "seed.sql"),
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
        if (stderr) { console.error(stderr); return { success: false, error: stderr }; }
        console.log(stdout);
        return { success: true };

    } catch (error) {
        console.error('Error resetting PostgreSQL:', error);
        await pgClient.query('ROLLBACK');
        return { success: false, error: (error as Error).message };
    }

};

export const resetNeo4j = async (): Promise<ResetState> => {
    try {
        await neo4jGraph.query(`
            MATCH (n) DETACH DELETE n;
        `);
        const [files]: GetFilesResponse = await bucket.getFiles();
        const signedFiles = (await Promise.all(files.map(async file => {
            if (["interruption_codes.csv", "progress_tracker.csv", "incident_history.csv"].includes(file.name)) return null;
            const [url] = await file.getSignedUrl({
                version: "v4",
                action: "read",
                expires: Date.now() + 3 * 60 * 1000,
            });
            return { name: file.name, url };
        }))).filter((file): file is SignedFile => file !== null);

        const originalCypher = await fs.readFile(path.join(DB_DIR, "neo4j", "schema.cypher"), "utf-8");
        let updatedCypher = originalCypher;
        for (const signedFile of signedFiles) {
            const textToReplace = `file:///${signedFile.name}`;
            updatedCypher = updatedCypher.replaceAll(textToReplace, signedFile.url);
        }

        const schemaFilePath = path.join(DB_DIR, "..", "tmp", "schema.cypher");
        await fs.writeFile(schemaFilePath, updatedCypher, "utf-8");

        const { stdout, stderr } = await execFileAsync(
            "cypher-shell",
            [
                "-a", dbConfig.neo4j.uri,
                "-d", dbConfig.neo4j.database,
                "-f", schemaFilePath,
            ],
            {
                env: {
                    ...process.env,
                    NEO4J_USERNAME: dbConfig.neo4j.userName,
                    NEO4J_PASSWORD: dbConfig.neo4j.password,
                }
            }
        );

        if (stderr) { console.error(stderr); return { success: false, error: stderr }; }
        console.log(stdout);

        return { success: true };
    } catch (error) {
        console.error('Error resetting Neo4j:', error);
        return { success: false, error: (error as Error).message };
    }
};