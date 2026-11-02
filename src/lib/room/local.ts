// Rooms this device has joined, kept in localStorage

export interface JoinedRoom {
  id: string;
  name: string;
  // null until the player picks a seat
  seat: number | null;
  ownerToken: string | null;
  lastOpened: number;
}

interface RoomStorage {
  current: string | null;
  rooms: JoinedRoom[];
}

const KEY = 'rooms';
const MAX_ROOMS = 20;

export const loadRooms = (): RoomStorage => {
  try {
    const json = localStorage.getItem(KEY);
    if (json !== null) return JSON.parse(json) as RoomStorage;
  } catch {
    // Fall through to an empty list when storage is unavailable or broken
  }
  return { current: null, rooms: [] };
};

export const saveRooms = (storage: RoomStorage) => {
  try {
    localStorage.setItem(
      KEY,
      JSON.stringify({
        ...storage,
        rooms: [...storage.rooms]
          .sort((a, b) => b.lastOpened - a.lastOpened)
          .slice(0, MAX_ROOMS)
      })
    );
  } catch {
    // The room still works for this session
  }
};

export const normalizeRoomId = (s: string) =>
  s.toUpperCase().replace(/[^A-Z0-9]/g, '');
