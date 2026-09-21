import dotenv from "dotenv";

dotenv.config();

const llmConfig = {
  model: process.env.MODEL!,
  apiKey: process.env.DEEPSEEK_API_KEY!,
  anthropicApiUrl: process.env.BASE_URL!,
};

const dbConfig = {
    postgres: {
        host: process.env.POSTGRES_HOST!,
        port: parseInt(process.env.POSTGRES_PORT!),
        username: process.env.POSTGRES_USERNAME!,
        password: process.env.POSTGRES_PASSWORD!,
        database: process.env.POSTGRES_DB!,
    },
    neo4j: {
        host: process.env.NEO4J_HOST!,
        port: parseInt(process.env.NEO4J_PORT!),
        username: process.env.NEO4J_USERNAME!,
        password: process.env.NEO4J_PASSWORD!,
        database: process.env.NEO4J_DB!,
    }
};

export { llmConfig, dbConfig };