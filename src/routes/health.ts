import { Hono, type Context } from 'hono';
import { pingDatabase } from '../db';
import type { AppEnv } from '../env';
import { messageOf } from '../http';

export const healthRoutes = new Hono<AppEnv>();

async function healthCheck(c: Context<AppEnv>): Promise<Response> {
  try {
    await pingDatabase(c.env.DB);
    return c.json({ status: 'healthy', database: 'd1', timestamp: new Date().toISOString() });
  } catch (err) {
    return c.json({ status: 'unhealthy', error: messageOf(err), database: 'd1' }, 503);
  }
}

healthRoutes.get('/health', healthCheck);
