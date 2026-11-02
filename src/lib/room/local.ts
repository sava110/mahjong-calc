// Rooms this device has joined, kept in localStorage

// A seat index, or watching without a seat
export type SeatChoice = number | 'spectator';

export interface JoinedRoom {
  id: string;
  name: string;
  // null until the player picks a seat or chooses to watch
  seat: SeatChoice | null;
  ownerToken: string | null;
  // Four-digit PIN; null for entries saved before PINs existed
  pin: string | null;
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

// NFKC turns full-width letters and digits from Japanese keyboards into ASCII
export const normalizeRoomId = (s: string) =>
  s
    .normalize('NFKC')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
