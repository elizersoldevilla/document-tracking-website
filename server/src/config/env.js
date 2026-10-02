import { z } from 'zod';

const booleanValue = z
  .enum(['true', 'false'])
  .default('false')
  .transform((value) => value === 'true');

const configSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  APP_ORIGIN: z.string().url().default('http://localhost:5173'),
  COOKIE_SECURE: booleanValue,
  DEMO_LOGIN_ENABLED: booleanValue,
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must contain at least 32 characters'),
  DB_HOST: z.string().min(1).default('127.0.0.1'),
  DB_PORT: z.coerce.number().int().min(1).max(65535).default(3306),
  DB_USER: z.string().min(1).default('root'),
  DB_PASSWORD: z.string().default(''),
  DB_NAME: z.string().regex(/^[a-zA-Z0-9_]+$/).default('clear_tracking'),
  DB_CONNECTION_LIMIT: z.coerce.number().int().min(1).max(50).default(10),
  DB_SSL: z.string().default(''),
  DEMO_STUDENT_EMAIL: z.string().default(''),
  DEMO_STUDENT_PASSWORD: z.string().default(''),
  DEMO_PROFESSOR_EMAIL: z.string().default(''),
  DEMO_PROFESSOR_PASSWORD: z.string().default(''),
  DEMO_ADMIN_EMAIL: z.string().default(''),
  DEMO_ADMIN_PASSWORD: z.string().default(''),
});

export function loadConfig(source = process.env) {
  const result = configSchema.safeParse(source);

  if (!result.success) {
    const message = result.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');
    throw new Error(`Invalid environment configuration: ${message}`);
  }

  const values = result.data;

  const demoLoginEnabled = values.DEMO_LOGIN_ENABLED && values.NODE_ENV !== 'production';

  return {
    nodeEnv: values.NODE_ENV,
    port: values.PORT,
    appOrigin: values.APP_ORIGIN,
    cookieSecure: values.COOKIE_SECURE || values.NODE_ENV === 'production',
    jwtSecret: values.JWT_SECRET,
    demoLogin: {
      enabled: demoLoginEnabled,
      accounts: demoLoginEnabled ? [
        {
          role: 'student',
          label: 'Student',
          email: values.DEMO_STUDENT_EMAIL,
          password: values.DEMO_STUDENT_PASSWORD,
        },
        {
          role: 'professor',
          label: 'IERC Committee',
          email: values.DEMO_PROFESSOR_EMAIL,
          password: values.DEMO_PROFESSOR_PASSWORD,
        },
      ].filter((account) => account.email && account.password) : [],
    },
    database: {
      host: values.DB_HOST,
      port: values.DB_PORT,
      user: values.DB_USER,
      password: values.DB_PASSWORD,
      database: values.DB_NAME,
      connectionLimit: values.DB_CONNECTION_LIMIT,
      ssl: values.DB_SSL,
    },
  };
}
