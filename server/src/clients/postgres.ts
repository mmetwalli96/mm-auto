import { DataSource } from "typeorm";
import { SqlDatabase } from "@langchain/classic/sql_db";

import { dbConfig } from "@config";

const postgresDataSource = new DataSource({
    type: "postgres",
    host: dbConfig.postgres.host,
    port: dbConfig.postgres.port,
    username: dbConfig.postgres.username,
    password: dbConfig.postgres.password,
    database: dbConfig.postgres.database,
});

const sqlDatabase = await SqlDatabase.fromDataSourceParams({
    appDataSource: postgresDataSource,
});

export { sqlDatabase, postgresDataSource };