import { sanitizeLogs, sanitizeObject } from './sanitizer';

export const logger = {
  info: (message: string, meta?: any) => {
    const cleanMsg = sanitizeLogs(message);
    const cleanMeta = meta ? (typeof meta === 'object' ? sanitizeObject(meta) : sanitizeLogs(String(meta))) : '';
    console.log(`[INFO] ${new Date().toISOString()} - ${cleanMsg}`, cleanMeta ? JSON.stringify(cleanMeta) : '');
  },
  warn: (message: string, meta?: any) => {
    const cleanMsg = sanitizeLogs(message);
    const cleanMeta = meta ? (typeof meta === 'object' ? sanitizeObject(meta) : sanitizeLogs(String(meta))) : '';
    console.warn(`[WARN] ${new Date().toISOString()} - ${cleanMsg}`, cleanMeta ? JSON.stringify(cleanMeta) : '');
  },
  error: (message: string, error?: any) => {
    const cleanMsg = sanitizeLogs(message);
    const cleanErr = error instanceof Error ? sanitizeLogs(error.stack || error.message) : error ? sanitizeObject(error) : '';
    console.error(`[ERROR] ${new Date().toISOString()} - ${cleanMsg}`, cleanErr || '');
  },
  debug: (message: string, meta?: any) => {
    if (process.env.NODE_ENV === 'development') {
      const cleanMsg = sanitizeLogs(message);
      const cleanMeta = meta ? (typeof meta === 'object' ? sanitizeObject(meta) : sanitizeLogs(String(meta))) : '';
      console.debug(`[DEBUG] ${new Date().toISOString()} - ${cleanMsg}`, cleanMeta ? JSON.stringify(cleanMeta) : '');
    }
  },
};
