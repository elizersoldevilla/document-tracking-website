import mysql from 'mysql2/promise';

export function parseSsl(value) {
  if (!value) return undefined;
  if (value === 'true') return { minVersion: 'TLSv1.2' };
  try {
    return JSON.parse(value);
  } catch {
    return { minVersion: 'TLSv1.2' };
  }
}

export function createDatabasePool(config) {
  return mysql.createPool({
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
    database: config.database,
    connectionLimit: config.connectionLimit,
    waitForConnections: true,
    queueLimit: 0,
    timezone: 'Z',
    charset: 'utf8mb4',
    decimalNumbers: true,
    ssl: parseSsl(config.ssl),
  });
}
