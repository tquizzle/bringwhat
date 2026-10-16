import { Hono } from 'hono';
import type { AppEnv } from './env';
import { messageOf } from './http';
import { eventRoutes } from './routes/events';
import { healthRoutes } from './routes/health';
import { itemRoutes } from './routes/items';
import { suggestRoutes } from './routes/suggest';

const app = new Hono<AppEnv>();

app.route('/', healthRoutes);
app.route('/', eventRoutes);
app.route('/', itemRoutes);
app.route('/', suggestRoutes);

app.onError((err, c) => {
  console.error('Unhandled error:', messageOf(err));
  return c.json({ error: 'Internal server error' }, 500);
});

// Anything that is not an API route is served from the static SPA build.
app.notFound((c) => c.env.ASSETS.fetch(c.req.raw));

export default app;
