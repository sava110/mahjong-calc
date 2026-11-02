// Room API server. Runs on Node.js 24 without a build step:
//   node server/index.ts
import { createServer } from 'node:http';
import { createApp } from './app.ts';
import { RoomStore } from './db.ts';

const port = Number(process.env.PORT ?? 8787);
const store = new RoomStore(process.env.DB_PATH ?? 'data/rooms.db');

const server = createServer(createApp({ store }));
server.listen(port, () => console.log(`room server listening on ${port}`));

const shutdown = () => {
  server.close();
  store.close();
  process.exit(0);
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
