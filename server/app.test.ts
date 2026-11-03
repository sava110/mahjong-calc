import { rmSync } from 'node:fs';
import { type Server, createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { DatabaseSync } from 'node:sqlite';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import type { Room, RoomRule } from '../src/lib/room/types.ts';
import { createApp } from './app.ts';
import { RoomStore } from './db.ts';

const rule: RoomRule = {
  players: 4,
  startPoints: 25000,
  returnPoints: 30000,
  uma: [30, 10, -10, -30],
  length: 'hanchan',
  tobi: true,
  honbaBonus: 100,
  sanmaTsumo: 'tsumo-son',
  roundedMangan: false
};
const newRoom = { name: 'test', rule, seats: ['A', 'B', 'C', 'D'] };

let server: Server;
let base: string;
let store: RoomStore;
// Each test uses its own client address, so rate limits do not carry over
let client = 0;

beforeAll(async () => {
  store = new RoomStore(':memory:');
  server = createServer(createApp({ store }));
  await new Promise<void>(resolve => server.listen(0, resolve));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/rooms`;
});
afterAll(() => {
  server.closeAllConnections();
  server.close();
  store.close();
});

const call = (
  path: string,
  init: { method?: string; body?: unknown; headers?: Record<string, string> }
) =>
  fetch(`${base}${path}`, {
    method: init.method ?? 'GET',
    headers: {
      'Content-Type': 'application/json',
      'CF-Connecting-IP': `10.0.0.${client}`,
      ...init.headers
    },
    ...(init.body === undefined ? {} : { body: JSON.stringify(init.body) })
  });

const create = async (pin = '1234') => {
  const res = await call('', {
    method: 'POST',
    body: { room: newRoom, pin }
  });
  expect(res.status).toBe(201);
  return (await res.json()) as { room: Room; ownerToken: string };
};

const get = (id: string, pin: string) =>
  call(`/${id}`, { headers: { 'X-Room-Pin': pin } });

describe('room server', () => {
  test('creates a room with a four-digit PIN', async () => {
    client = 1;
    for (const pin of ['123', '12345', 'abcd', 1234])
      expect(
        (await call('', { method: 'POST', body: { room: newRoom, pin } }))
          .status
      ).toBe(400);
    const { room } = await create();
    expect(room.id).toMatch(/^[A-Z2-9]{6}$/);
  });

  test('needs the PIN to read, follow, and change a room', async () => {
    client = 2;
    const { room } = await create('0420');
    expect((await get(room.id, '0000')).status).toBe(403);
    expect((await call(`/${room.id}`, {})).status).toBe(403);
    const ok = await get(room.id.toLowerCase(), '0420');
    expect(((await ok.json()) as { room: Room }).room.id).toBe(room.id);
    expect((await get('ZZZZZZ', '0420')).status).toBe(404);
    expect((await call(`/${room.id}/events?pin=1111`, {})).status).toBe(403);

    const op = { type: 'set-seat', seat: 1, name: 'Bob' };
    const noPin = await call(`/${room.id}/ops`, {
      method: 'POST',
      body: { op, baseVersion: 1 }
    });
    expect(noPin.status).toBe(403);
    const send = (baseVersion: number) =>
      call(`/${room.id}/ops`, {
        method: 'POST',
        headers: { 'X-Room-Pin': '0420' },
        body: { op, baseVersion }
      });
    const res = await send(1);
    expect(((await res.json()) as { room: Room }).room.seats[1]).toBe('Bob');
    // A stale version is rejected with the current room
    const stale = await send(1);
    expect(stale.status).toBe(409);
    expect(((await stale.json()) as { room: Room }).room.version).toBe(2);
  });

  test('locks out repeated wrong PINs', async () => {
    client = 3;
    const { room } = await create('9876');
    for (let i = 0; i < 10; i++)
      expect((await get(room.id, '0000')).status).toBe(403);
    // Even the right PIN is refused while locked out
    expect((await get(room.id, '9876')).status).toBe(429);
  });

  test('lets the owner change the PIN and delete the room', async () => {
    client = 4;
    const { room, ownerToken } = await create('1111');
    const stream = await call(`/${room.id}/events?pin=1111`, {});
    const reader = (stream.body as ReadableStream<Uint8Array>).getReader();
    const decoder = new TextDecoder();
    const read = async () => decoder.decode((await reader.read()).value);
    expect(await read()).toContain('"version":1');

    const changePin = (token: string, pin: string) =>
      call(`/${room.id}/pin`, {
        method: 'PUT',
        headers: { 'X-Owner-Token': token },
        body: { pin }
      });
    expect((await changePin('wrong', '2222')).status).toBe(403);
    expect((await changePin(ownerToken, '22')).status).toBe(400);
    expect((await changePin(ownerToken, '2222')).status).toBe(204);
    // Followers are told to enter the new PIN
    expect(await read()).toContain('"pinChanged":true');
    expect((await get(room.id, '1111')).status).toBe(403);
    expect((await get(room.id, '2222')).status).toBe(200);

    const del = (token: string) =>
      call(`/${room.id}`, {
        method: 'DELETE',
        headers: { 'X-Owner-Token': token }
      });
    expect((await del('wrong')).status).toBe(403);
    expect((await del(ownerToken)).status).toBe(204);
    expect((await get(room.id, '2222')).status).toBe(404);
  });

  test('gathers reported rons and lets only the owner move on', async () => {
    client = 6;
    const { room, ownerToken } = await create('3333');
    let version = room.version;
    const op = async (body: unknown, token?: string) => {
      const res = await call(`/${room.id}/ops`, {
        method: 'POST',
        headers: {
          'X-Room-Pin': '3333',
          ...(token === undefined ? {} : { 'X-Owner-Token': token })
        },
        body: { op: body, baseVersion: version }
      });
      if (res.ok) version = ((await res.json()) as { room: Room }).room.version;
      return res;
    };
    const win = (winner: number, base: number) => ({
      winner,
      base,
      han: null,
      fu: null,
      yakuman: 0
    });
    const report = (winner: number, loser: number | null) => ({
      type: 'report-hora',
      game: 0,
      loser,
      win: win(winner, 2000),
      riichi: [winner]
    });

    // Two players report a ron on the same discard from their own phones
    expect((await op(report(1, 3))).status).toBe(200);
    expect((await op(report(2, 3))).status).toBe(200);
    // A tsumo cannot join a ron
    expect((await op(report(0, null))).status).toBe(422);
    const pending = (
      (await (await get(room.id, '3333')).json()) as { room: Room }
    ).room.pending;
    expect(pending?.wins.map(w => w.winner)).toEqual([1, 2]);
    expect(pending?.riichi).toEqual([1, 2]);

    const confirm = {
      type: 'confirm-hora',
      game: 0,
      event: {
        type: 'hora',
        at: 1,
        riichi: [1, 2],
        loser: 3,
        wins: [win(1, 2000), win(2, 2000)],
        deltas: [0, 8000, 9000, -17000]
      }
    };
    const draw = {
      type: 'append',
      game: 0,
      event: {
        type: 'ryukyoku',
        at: 1,
        riichi: [],
        tenpai: [],
        deltas: [0, 0, 0, 0]
      }
    };
    // Only the owner confirms the hand or records a draw
    expect((await op(confirm)).status).toBe(403);
    expect((await op(draw)).status).toBe(403);
    expect((await op(confirm, 'wrong')).status).toBe(403);
    expect((await op(confirm, ownerToken)).status).toBe(200);
    const after = (
      (await (await get(room.id, '3333')).json()) as { room: Room }
    ).room;
    expect(after.pending).toBeNull();
    expect(after.games[0]?.events.length).toBe(1);
    expect((await op(draw, ownerToken)).status).toBe(200);
  });

  test('limits rooms created by one client', async () => {
    client = 5;
    for (let i = 0; i < 10; i++) await create();
    expect(
      (await call('', { method: 'POST', body: { room: newRoom, pin: '1234' } }))
        .status
    ).toBe(429);
  });
});

describe('room store', () => {
  test('drops rooms created before PINs', () => {
    const path = `${process.env.TMPDIR ?? '/tmp'}/rooms-${Date.now()}.db`;
    const old = new DatabaseSync(path);
    old.exec(`
      CREATE TABLE rooms (id TEXT PRIMARY KEY, doc TEXT NOT NULL,
        version INTEGER NOT NULL, owner_hash TEXT NOT NULL,
        created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL);
      INSERT INTO rooms VALUES ('OLD234', '{}', 1, 'x', 0, 0);
    `);
    old.close();
    const migrated = new RoomStore(path);
    expect(migrated.exists('OLD234')).toBe(false);
    migrated.close();
    for (const suffix of ['', '-wal', '-shm'])
      rmSync(`${path}${suffix}`, { force: true });
  });
});
