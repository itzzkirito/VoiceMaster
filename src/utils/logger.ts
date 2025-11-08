import pino from 'pino';
import { env } from '../config/env.config';

const isDevelopment = env.NODE_ENV === 'development';

// Build logger options conditionally to satisfy exactOptionalPropertyTypes
const loggerOptions: pino.LoggerOptions = {
  level: env.LOG_LEVEL,
  ...(isDevelopment && {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'HH:MM:ss',
        ignore: 'pid,hostname',
      },
    },
  }),
};

export const logger = pino(loggerOptions);

// Convenience methods
export const log = {
  info: (message: string, ...args: unknown[]) => logger.info({ args }, message),
  error: (message: string, error?: Error) => logger.error({ err: error }, message),
  warn: (message: string, ...args: unknown[]) => logger.warn({ args }, message),
  debug: (message: string, ...args: unknown[]) => logger.debug({ args }, message),
};

