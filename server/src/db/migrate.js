import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import mysql from 'mysql2/promise';
import { loadConfig } from '../config/env.js';
import { parseSsl } from './pool.js';

const config = loadConfig();
const schemaSql = await readFile(new URL('../../../database/schema.sql', import.meta.url), 'utf8');
const connectionOptions = {
  host: config.database.host,
  port: config.database.port,
  user: config.database.user,
  password: config.database.password,
  multipleStatements: true,
  timezone: 'Z',
  ssl: parseSsl(config.database.ssl),
};
const serverConnection = await mysql.createConnection(connectionOptions);

try {
  await serverConnection.query(
    `CREATE DATABASE IF NOT EXISTS \`${config.database.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
  );
} finally {
  await serverConnection.end();
}

const schemaConnection = await mysql.createConnection({
  ...connectionOptions,
  database: config.database.database,
});

try {
  await schemaConnection.query(schemaSql);
  console.log(`Database ${config.database.database} is ready.`);
} finally {
  await schemaConnection.end();
}
