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

export const createRoom = (pin: string, room: NewRoomInput) =>
  request<{ room: Room; ownerToken: string }>('', {
    method: 'POST',
    body: JSON.stringify({ room, pin })
  });

const path = (id: string) => `/${encodeURIComponent(id)}`;

export const fetchRoom = async (id: string, pin: string) =>
  (await request<{ room: Room }>(path(id), { headers: { 'X-Room-Pin': pin } }))
    .room;

export const postOp = async (
  id: string,
  pin: string,
  op: RoomOp,
  baseVersion: number
) =>
  (
    await request<{ room: Room }>(`${path(id)}/ops`, {
      method: 'POST',
      headers: { 'X-Room-Pin': pin },
      body: JSON.stringify({ op, baseVersion })
    })
  ).room;

export const changePin = (id: string, ownerToken: string, pin: string) =>
  request<void>(`${path(id)}/pin`, {
    method: 'PUT',
    headers: { 'X-Owner-Token': ownerToken },
    body: JSON.stringify({ pin })
  });

export const deleteRoom = (id: string, ownerToken: string) =>
  request<void>(path(id), {
    method: 'DELETE',
    headers: { 'X-Owner-Token': ownerToken }
  });

export type RoomNotice =
  | { type: 'version'; version: number }
  | { type: 'deleted' }
  | { type: 'pin-changed' }
  // The stream stopped and will not reconnect by itself
  | { type: 'closed' };

// EventSource reconnects by itself after network errors. It cannot send
// headers, so the PIN goes in the query string.
export const subscribeRoom = (
  id: string,
  pin: string,
  onNotice: (notice: RoomNotice) => void
) => {
  const source = new EventSource(
    `/api/rooms${path(id)}/events?pin=${encodeURIComponent(pin)}`
  );
  source.onmessage = e => {
    const data = JSON.parse(String(e.data)) as {
      version?: number;
      deleted?: boolean;
      pinChanged?: boolean;
    };
    if (data.deleted === true) {
      source.close();
      onNotice({ type: 'deleted' });
    } else if (data.pinChanged === true) {
      source.close();
      onNotice({ type: 'pin-changed' });
    } else if (typeof data.version === 'number')
      onNotice({ type: 'version', version: data.version });
  };
  source.onerror = () => {
    // EventSource retries network errors itself, but not HTTP errors
    if (source.readyState === EventSource.CLOSED) onNotice({ type: 'closed' });
  };
  return () => source.close();
};

export const randomPin = () =>
  String((crypto.getRandomValues(new Uint32Array(1))[0] ?? 0) % 10000).padStart(
    4,
    '0'
  );

export const inviteUrl = (id: string, pin: string) =>
  `${location.origin}/?room=${encodeURIComponent(id)}&pin=${encodeURIComponent(pin)}`;
