import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  PORT: z.string().default('4000').transform((val) => parseInt(val, 10)),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters'),
  JWT_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_SECRET: z.string().default('refresh-super-secret-key-min-32-characters'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  CREDENTIAL_ENCRYPTION_KEY: z.string().min(32, 'CREDENTIAL_ENCRYPTION_KEY must be at least 32 characters'),
  RABBITMQ_URL: z.string().default('amqp://guest:guest@localhost:5672'),
  /**
   * When true (or when RabbitMQ is unreachable), the API process runs the
   * Terraform worker inline so deployments complete on single-node installs
   * without a message broker. Set to "false" in multi-process deployments.
   */
  INLINE_WORKER_FALLBACK: z
    .string()
    .default('true')
    .transform((val) => val !== 'false'),
  TERRAFORM_WORKSPACE_DIR: z.string().default('./terraform_workspaces'),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error('❌ Invalid environment variables:', JSON.stringify(parsedEnv.error.format(), null, 2));
  throw new Error('Invalid environment variables configuration');
}

export const env = parsedEnv.data;
