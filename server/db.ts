import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import type { Room } from '../src/lib/room/types.ts';

const column = (row: unknown, name: string): string | null =>
  typeof row === 'object' && row !== null && name in row
    ? String((row as Record<string, unknown>)[name])
    : null;

// Rooms are stored as JSON documents with a version for optimistic locking
export class RoomStore {
  #db: DatabaseSync;

  constructor(path: string) {
    if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
    this.#db = new DatabaseSync(path);
    this.#db.exec(`
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS rooms (
        id TEXT PRIMARY KEY,
        doc TEXT NOT NULL,
        version INTEGER NOT NULL,
        owner_hash TEXT NOT NULL,
        pin_hash TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
    `);
    const columns = this.#db.prepare('PRAGMA table_info(rooms)').all();
    if (!columns.some(c => column(c, 'name') === 'pin_hash'))
      this.#db.exec('ALTER TABLE rooms ADD COLUMN pin_hash TEXT');
    // Rooms from before per-room PINs cannot be joined any more; the owner
    // agreed to drop them
    const dropped = this.#db
      .prepare('DELETE FROM rooms WHERE pin_hash IS NULL')
      .run();
    if (Number(dropped.changes) > 0)
      console.log(`deleted ${dropped.changes} rooms without a PIN`);
  }

  exists(id: string): boolean {
    return (
      this.#db.prepare('SELECT 1 FROM rooms WHERE id = ?').get(id) !== undefined
    );
  }

  get(id: string): Room | null {
    const row = this.#db.prepare('SELECT doc FROM rooms WHERE id = ?').get(id);
    const doc = column(row, 'doc');
    return doc === null ? null : (JSON.parse(doc) as Room);
  }

  ownerHash(id: string): string | null {
    const row = this.#db
      .prepare('SELECT owner_hash FROM rooms WHERE id = ?')
      .get(id);
    return column(row, 'owner_hash');
  }

  pinHash(id: string): string | null {
    const row = this.#db
      .prepare('SELECT pin_hash FROM rooms WHERE id = ?')
      .get(id);
    return column(row, 'pin_hash');
  }

  setPinHash(id: string, pinHash: string): void {
    this.#db
      .prepare('UPDATE rooms SET pin_hash = ? WHERE id = ?')
      .run(pinHash, id);
  }

  insert(room: Room, ownerHash: string, pinHash: string): void {
    this.#db
      .prepare(
        'INSERT INTO rooms (id, doc, version, owner_hash, pin_hash, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
      )
      .run(
        room.id,
        JSON.stringify(room),
        room.version,
        ownerHash,
        pinHash,
        room.createdAt,
        room.updatedAt
      );
  }

  // Returns false when the stored version is no longer `baseVersion`
  update(room: Room, baseVersion: number): boolean {
    const result = this.#db
      .prepare(
        'UPDATE rooms SET doc = ?, version = ?, updated_at = ? WHERE id = ? AND version = ?'
      )
      .run(
        JSON.stringify(room),
        room.version,
        room.updatedAt,
        room.id,
        baseVersion
      );
    return Number(result.changes) === 1;
  }

  delete(id: string): void {
    this.#db.prepare('DELETE FROM rooms WHERE id = ?').run(id);
  }

  close(): void {
    this.#db.close();
  }
}
