import { DataSource } from "typeorm";
import { SqlDatabase } from "@langchain/classic/sql_db";
import pg from 'pg';
import { dbConfig } from "@config";

const postgresDataSource = new DataSource({
    type: "postgres",
    host: dbConfig.postgres.host,
    port: dbConfig.postgres.port,
    username: dbConfig.postgres.userName,
    password: dbConfig.postgres.password,
    database: dbConfig.postgres.database,
    ssl:  dbConfig.postgres.ssl ? { rejectUnauthorized: false } : false,
});

const sqlDatabase = await SqlDatabase.fromDataSourceParams({
    appDataSource: postgresDataSource,
});

const { Client } = pg;
const pgClient = new Client({
    host: dbConfig.postgres.host,
    port: dbConfig.postgres.port,
    user: dbConfig.postgres.userName,
    password: dbConfig.postgres.password,
    database: dbConfig.postgres.database,
    ssl: dbConfig.postgres.ssl ? { rejectUnauthorized: false } : false,
});

await pgClient.connect();

export { sqlDatabase, postgresDataSource, pgClient };