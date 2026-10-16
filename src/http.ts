import type { Context } from 'hono';
import type { AppEnv } from './env';

export async function readJsonBody(c: Context<AppEnv>): Promise<unknown> {
  try {
    return await c.req.json<unknown>();
  } catch {
    return undefined;
  }
}

export function messageOf(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

export function serverError(c: Context<AppEnv>, message: string, err: unknown): Response {
  console.error(message, messageOf(err));
  return c.json({ error: message }, 500);
}
