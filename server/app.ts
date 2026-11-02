import {
  createHash,
  randomBytes,
  randomInt,
  timingSafeEqual
} from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import {
  applyOp,
  createRoom,
  parseNewRoom,
  parseOp
} from '../src/lib/room/ops.ts';
import type { Room } from '../src/lib/room/types.ts';
import type { RoomStore } from './db.ts';

export interface AppOptions {
  store: RoomStore;
  // Rooms cannot be created while this is empty
  password: string;
  now?: () => number;
}

const MAX_BODY = 64 * 1024;
const HEARTBEAT_MS = 25_000;
// Failed password attempts allowed per client in the window
const MAX_FAILURES = 10;
const FAILURE_WINDOW_MS = 10 * 60_000;
// Without 0/O/1/I/L so codes are easy to read aloud
const ID_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const ID_LENGTH = 6;

const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');

const safeEqual = (a: string, b: string) => {
  const x = Buffer.from(sha256(a));
  const y = Buffer.from(sha256(b));
  return timingSafeEqual(x, y);
};

class HttpError extends Error {
  status: number;
  body: unknown;
  constructor(status: number, message: string, body?: unknown) {
    super(message);
    this.status = status;
    this.body = body ?? { error: message };
  }
}

const readJson = (req: IncomingMessage): Promise<unknown> =>
  new Promise((resolve, reject) => {
    let size = 0;
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size > MAX_BODY) {
        reject(new HttpError(413, 'body too large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf-8')));
      } catch {
        reject(new HttpError(400, 'invalid json'));
      }
    });
    req.on('error', reject);
  });

const send = (res: ServerResponse, status: number, body?: unknown) => {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store'
  });
  res.end(body === undefined ? undefined : JSON.stringify(body));
};

const clientKey = (req: IncomingMessage) => {
  const cf = req.headers['cf-connecting-ip'];
  if (typeof cf === 'string') return cf;
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string')
    return forwarded.split(',')[0]?.trim() ?? '';
  return req.socket.remoteAddress ?? '';
};

export const createApp = ({ store, password, now = Date.now }: AppOptions) => {
  const subscribers = new Map<string, Set<ServerResponse>>();
  const failures = new Map<string, number[]>();

  const broadcast = (room: Room) => {
    for (const res of subscribers.get(room.id) ?? [])
      res.write(`data: ${JSON.stringify({ version: room.version })}\n\n`);
  };

  const checkPassword = (req: IncomingMessage, given: unknown) => {
    if (password === '') throw new HttpError(503, 'room creation disabled');
    const key = clientKey(req);
    const t = now();
    const recent = (failures.get(key) ?? []).filter(
      f => t - f < FAILURE_WINDOW_MS
    );
    if (recent.length >= MAX_FAILURES)
      throw new HttpError(429, 'too many attempts');
    if (typeof given !== 'string' || !safeEqual(given, password)) {
      failures.set(key, [...recent, t]);
      throw new HttpError(403, 'wrong password');
    }
    failures.delete(key);
  };

  const newId = () => {
    for (;;) {
      const id = Array.from(
        { length: ID_LENGTH },
        () => ID_ALPHABET[randomInt(ID_ALPHABET.length)]
      ).join('');
      if (!store.exists(id)) return id;
    }
  };

  const getRoom = (id: string) => {
    const room = store.get(id);
    if (room === null) throw new HttpError(404, 'room not found');
    return room;
  };

  const subscribe = (req: IncomingMessage, res: ServerResponse, room: Room) => {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-store',
      Connection: 'keep-alive',
      // Stop nginx from buffering the stream
      'X-Accel-Buffering': 'no'
    });
    res.write(`data: ${JSON.stringify({ version: room.version })}\n\n`);
    const set = subscribers.get(room.id) ?? new Set();
    set.add(res);
    subscribers.set(room.id, set);
    const heartbeat = setInterval(() => res.write(': ping\n\n'), HEARTBEAT_MS);
    req.on('close', () => {
      clearInterval(heartbeat);
      set.delete(res);
      if (set.size === 0) subscribers.delete(room.id);
    });
  };

  const route = async (req: IncomingMessage, res: ServerResponse) => {
    const url = new URL(req.url ?? '/', 'http://localhost');
    const parts = url.pathname.split('/').filter(p => p !== '');
    if (parts[0] !== 'api' || parts[1] !== 'rooms')
      throw new HttpError(404, 'not found');
    const id = parts[2]?.toUpperCase();
    const action = parts[3];

    if (id === undefined) {
      if (req.method !== 'POST') throw new HttpError(405, 'method not allowed');
      const body = await readJson(req);
      const b = (body ?? {}) as Record<string, unknown>;
      checkPassword(req, b.password);
      const input = parseNewRoom(b.room);
      if (input === null) throw new HttpError(400, 'invalid room');
      const ownerToken = randomBytes(24).toString('hex');
      const room = createRoom(newId(), input, now());
      store.insert(room, sha256(ownerToken));
      send(res, 201, { room, ownerToken });
      return;
    }

    if (action === undefined) {
      if (req.method === 'GET') {
        send(res, 200, { room: getRoom(id) });
        return;
      }
      if (req.method === 'DELETE') {
        const hash = store.ownerHash(id);
        if (hash === null) throw new HttpError(404, 'room not found');
        const token = req.headers['x-owner-token'];
        if (typeof token !== 'string' || !safeEqual(sha256(token), hash))
          throw new HttpError(403, 'not the owner');
        store.delete(id);
        for (const sub of subscribers.get(id) ?? [])
          sub.end(`data: ${JSON.stringify({ deleted: true })}\n\n`);
        send(res, 204);
        return;
      }
      throw new HttpError(405, 'method not allowed');
    }

    if (action === 'events' && req.method === 'GET') {
      subscribe(req, res, getRoom(id));
      return;
    }

    if (action === 'ops' && req.method === 'POST') {
      const body = (await readJson(req)) as Record<string, unknown> | null;
      const room = getRoom(id);
      const baseVersion = body?.baseVersion;
      // Every op is based on what the sender saw, so a hand entered on a
      // stale screen is never applied on top of someone else's input
      if (baseVersion !== room.version)
        throw new HttpError(409, 'version conflict', {
          error: 'version conflict',
          room
        });
      const op = parseOp(body?.op, room);
      if (op === null) throw new HttpError(400, 'invalid op');
      const next = applyOp(room, op, now());
      if (typeof next === 'string') throw new HttpError(422, next);
      if (!store.update(next, room.version))
        throw new HttpError(409, 'version conflict', {
          error: 'version conflict',
          room: getRoom(id)
        });
      broadcast(next);
      send(res, 200, { room: next });
      return;
    }

    throw new HttpError(404, 'not found');
  };

  return async (req: IncomingMessage, res: ServerResponse) => {
    try {
      await route(req, res);
    } catch (e) {
      if (e instanceof HttpError) send(res, e.status, e.body);
      else {
        console.error(e);
        send(res, 500, { error: 'internal error' });
      }
    }
  };
};
