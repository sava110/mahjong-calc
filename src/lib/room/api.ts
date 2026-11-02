import type { NewRoomInput } from './ops';
import type { Room, RoomOp } from './types';

export class RoomApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

// Thrown when someone else updated the room first
export class RoomConflictError extends Error {
  room: Room;
  constructor(room: Room) {
    super('version conflict');
    this.room = room;
  }
}

const request = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const res = await fetch(`/api/rooms${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers }
  });
  if (res.status === 204) return undefined as T;
  const body = (await res.json().catch(() => ({}))) as {
    error?: string;
    room?: Room;
  };
  if (res.status === 409 && body.room !== undefined)
    throw new RoomConflictError(body.room);
  if (!res.ok) throw new RoomApiError(res.status, body.error ?? res.statusText);
  return body as T;
};

export const createRoom = (password: string, room: NewRoomInput) =>
  request<{ room: Room; ownerToken: string }>('', {
    method: 'POST',
    body: JSON.stringify({ password, room })
  });

export const fetchRoom = async (id: string) =>
  (await request<{ room: Room }>(`/${encodeURIComponent(id)}`)).room;

export const postOp = async (id: string, op: RoomOp, baseVersion: number) =>
  (
    await request<{ room: Room }>(`/${encodeURIComponent(id)}/ops`, {
      method: 'POST',
      body: JSON.stringify({ op, baseVersion })
    })
  ).room;

export const deleteRoom = (id: string, ownerToken: string) =>
  request<void>(`/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: { 'X-Owner-Token': ownerToken }
  });

// Calls back with the latest version, or null when the room was deleted.
// EventSource reconnects by itself after network errors.
export const subscribeRoom = (
  id: string,
  onChange: (version: number | null) => void
) => {
  const source = new EventSource(`/api/rooms/${encodeURIComponent(id)}/events`);
  source.onmessage = e => {
    const data = JSON.parse(String(e.data)) as {
      version?: number;
      deleted?: boolean;
    };
    if (data.deleted === true) {
      source.close();
      onChange(null);
    } else if (typeof data.version === 'number') onChange(data.version);
  };
  return () => source.close();
};
