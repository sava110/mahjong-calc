import { type Server, createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
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

beforeAll(async () => {
  store = new RoomStore(':memory:');
  server = createServer(createApp({ store, password: 'secret' }));
  await new Promise<void>(resolve => server.listen(0, resolve));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/rooms`;
});
afterAll(() => {
  server.closeAllConnections();
  server.close();
  store.close();
});

const post = (path: string, body: unknown) =>
  fetch(`${base}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

const create = async () => {
  const res = await post('', { password: 'secret', room: newRoom });
  expect(res.status).toBe(201);
  return (await res.json()) as { room: Room; ownerToken: string };
};

describe('room server', () => {
  test('requires the password', async () => {
    expect((await post('', { password: 'nope', room: newRoom })).status).toBe(
      403
    );
    expect(
      (await post('', { password: 'secret', room: { ...newRoom, seats: [] } }))
        .status
    ).toBe(400);
  });

  test('creates, reads with a lower-case id, and applies ops', async () => {
    const { room } = await create();
    expect(room.id).toMatch(/^[A-Z2-9]{6}$/);
    const got = await fetch(`${base}/${room.id.toLowerCase()}`);
    expect(((await got.json()) as { room: Room }).room.id).toBe(room.id);

    const op = { type: 'set-seat', seat: 1, name: 'Bob' };
    const ok = await post(`/${room.id}/ops`, { op, baseVersion: 1 });
    expect(ok.status).toBe(200);
    const next = ((await ok.json()) as { room: Room }).room;
    expect([next.version, next.seats[1]]).toEqual([2, 'Bob']);

    // A stale version is rejected with the current room
    const stale = await post(`/${room.id}/ops`, { op, baseVersion: 1 });
    expect(stale.status).toBe(409);
    expect(((await stale.json()) as { room: Room }).room.version).toBe(2);

    const bad = await post(`/${room.id}/ops`, {
      op: { type: 'undo', game: 0 },
      baseVersion: 2
    });
    expect(bad.status).toBe(422);
  });

  test('notifies subscribers and lets only the owner delete', async () => {
    const { room, ownerToken } = await create();
    const controller = new AbortController();
    const stream = await fetch(`${base}/${room.id}/events`, {
      signal: controller.signal
    });
    const reader = (stream.body as ReadableStream<Uint8Array>).getReader();
    const decoder = new TextDecoder();
    const read = async () => decoder.decode((await reader.read()).value);
    expect(await read()).toContain('"version":1');
    await post(`/${room.id}/ops`, { op: { type: 'new-game' }, baseVersion: 1 });
    expect(await read()).toContain('"version":2');
    controller.abort();

    const del = (token: string) =>
      fetch(`${base}/${room.id}`, {
        method: 'DELETE',
        headers: { 'X-Owner-Token': token }
      });
    expect((await del('wrong')).status).toBe(403);
    expect((await del(ownerToken)).status).toBe(204);
    expect((await fetch(`${base}/${room.id}`)).status).toBe(404);
  });
});
