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
  isPin,
  parseNewRoom,
  parseOp
} from '../src/lib/room/ops.ts';
import type { Room } from '../src/lib/room/types.ts';
import type { RoomStore } from './db.ts';

export interface AppOptions {
  store: RoomStore;
  now?: () => number;
}

const MAX_BODY = 64 * 1024;
const HEARTBEAT_MS = 25_000;
// Rooms one client can create in the window
const MAX_CREATES = 10;
const CREATE_WINDOW_MS = 60 * 60_000;
// Wrong PINs allowed per client and room, and per room from anyone, in the
// window. A four-digit PIN is only safe behind these limits.
const MAX_PIN_FAILURES = 10;
const MAX_ROOM_PIN_FAILURES = 30;
const PIN_WINDOW_MS = 10 * 60_000;
// Without 0/O/1/I/L so codes are easy to read aloud
const ID_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const ID_LENGTH = 6;

const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');

// The room id salts the hash so equal PINs do not look alike
const pinHashOf = (id: string, pin: string) => sha256(`${id}:${pin}`);

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

// Timestamps of recent events per key, for rate limits
class RecentEvents {
  #events = new Map<string, number[]>();
  #window: number;
  constructor(window: number) {
    this.#window = window;
  }
  count(key: string, now: number) {
    const recent = (this.#events.get(key) ?? []).filter(
      t => now - t < this.#window
    );
    if (recent.length === 0) this.#events.delete(key);
    else this.#events.set(key, recent);
    return recent.length;
  }
  add(key: string, now: number) {
    this.#events.set(key, [...(this.#events.get(key) ?? []), now]);
  }
  clear(key: string) {
    this.#events.delete(key);
  }
}

export const createApp = ({ store, now = Date.now }: AppOptions) => {
  const subscribers = new Map<string, Set<ServerResponse>>();
  const creates = new RecentEvents(CREATE_WINDOW_MS);
  const pinFailures = new RecentEvents(PIN_WINDOW_MS);

  const notify = (id: string, data: unknown, end = false) => {
    for (const res of subscribers.get(id) ?? []) {
      const message = `data: ${JSON.stringify(data)}\n\n`;
      if (end) res.end(message);
      else res.write(message);
    }
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

  const checkPin = (req: IncomingMessage, id: string, given: unknown) => {
    const hash = store.pinHash(id);
    if (hash === null) throw new HttpError(404, 'room not found');
    const t = now();
    const clientRoom = `${clientKey(req)}:${id}`;
    if (
      pinFailures.count(clientRoom, t) >= MAX_PIN_FAILURES ||
      pinFailures.count(id, t) >= MAX_ROOM_PIN_FAILURES
    )
      throw new HttpError(429, 'too many attempts');
    if (!isPin(given) || !safeEqual(pinHashOf(id, given), hash)) {
      pinFailures.add(clientRoom, t);
      pinFailures.add(id, t);
      throw new HttpError(403, 'wrong pin');
    }
    pinFailures.clear(clientRoom);
  };

  const checkOwner = (req: IncomingMessage, id: string) => {
    const hash = store.ownerHash(id);
    if (hash === null) throw new HttpError(404, 'room not found');
    const token = req.headers['x-owner-token'];
    if (typeof token !== 'string' || !safeEqual(sha256(token), hash))
      throw new HttpError(403, 'not the owner');
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
    const pin = req.headers['x-room-pin'];

    if (id === undefined) {
      if (req.method !== 'POST') throw new HttpError(405, 'method not allowed');
      const body = (await readJson(req)) as Record<string, unknown> | null;
      const t = now();
      const client = clientKey(req);
      if (creates.count(client, t) >= MAX_CREATES)
        throw new HttpError(429, 'too many rooms');
      const input = parseNewRoom(body?.room);
      if (input === null || !isPin(body?.pin))
        throw new HttpError(400, 'invalid room');
      creates.add(client, t);
      const ownerToken = randomBytes(24).toString('hex');
      const room = createRoom(newId(), input, t);
      store.insert(room, sha256(ownerToken), pinHashOf(room.id, body.pin));
      send(res, 201, { room, ownerToken });
      return;
    }

    if (action === undefined) {
      if (req.method === 'GET') {
        checkPin(req, id, pin);
        send(res, 200, { room: getRoom(id) });
        return;
      }
      if (req.method === 'DELETE') {
        checkOwner(req, id);
        store.delete(id);
        notify(id, { deleted: true }, true);
        send(res, 204);
        return;
      }
      throw new HttpError(405, 'method not allowed');
    }

    // EventSource cannot send headers, so the stream takes the PIN in the
    // query string
    if (action === 'events' && req.method === 'GET') {
      checkPin(req, id, url.searchParams.get('pin'));
      subscribe(req, res, getRoom(id));
      return;
    }

    if (action === 'pin' && req.method === 'PUT') {
      checkOwner(req, id);
      const body = (await readJson(req)) as Record<string, unknown> | null;
      if (!isPin(body?.pin)) throw new HttpError(400, 'invalid pin');
      store.setPinHash(id, pinHashOf(id, body.pin));
      // Others must enter the new PIN
      notify(id, { pinChanged: true }, true);
      send(res, 204);
      return;
    }

    if (action === 'ops' && req.method === 'POST') {
      checkPin(req, id, pin);
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
      notify(id, { version: next.version });
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
