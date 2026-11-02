import {
  type FC,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';
import type React from 'react';
import {
  RoomConflictError,
  createRoom as apiCreateRoom,
  deleteRoom as apiDeleteRoom,
  fetchRoom,
  postOp,
  subscribeRoom
} from '../lib/room/api';
import {
  type JoinedRoom,
  loadRooms,
  normalizeRoomId,
  saveRooms
} from '../lib/room/local';
import type { NewRoomInput } from '../lib/room/ops';
import type { Room, RoomOp } from '../lib/room/types';
import { useStore } from './store';

// A win taken over from the calculator screen
export interface HoraPrefill {
  by: 'ron' | 'tsumo';
  base: number;
  han: number | null;
  fu: number | null;
  yakuman: number;
  riichi: boolean;
}

export type SendResult = 'ok' | 'conflict' | 'error';

interface RoomContextValue {
  joined: JoinedRoom[];
  current: JoinedRoom | null;
  room: Room | null;
  status: 'idle' | 'loading' | 'ready' | 'not-found' | 'offline';
  open: (id: string) => Promise<boolean>;
  create: (password: string, input: NewRoomInput) => Promise<void>;
  leave: () => void;
  forget: (id: string) => void;
  setSeat: (seat: number | null) => void;
  send: (op: RoomOp) => Promise<SendResult>;
  remove: () => Promise<void>;
  pendingHora: HoraPrefill | null;
  setPendingHora: (prefill: HoraPrefill | null) => void;
}

const RoomContext = createContext<RoomContextValue | null>(null);

export const RoomProvider: FC<{ children?: React.ReactNode }> = ({
  children
}) => {
  const [, dispatch] = useStore();
  const [storage, setStorage] = useState(loadRooms);
  const [room, setRoom] = useState<Room | null>(null);
  const [status, setStatus] = useState<RoomContextValue['status']>('idle');
  const [pendingHora, setPendingHora] = useState<HoraPrefill | null>(null);

  const current = storage.rooms.find(r => r.id === storage.current) ?? null;

  const update = useCallback(
    (f: (s: ReturnType<typeof loadRooms>) => ReturnType<typeof loadRooms>) =>
      setStorage(s => {
        const next = f(s);
        saveRooms(next);
        return next;
      }),
    []
  );

  const remember = useCallback(
    (r: Room, patch: Partial<JoinedRoom> = {}) =>
      update(s => {
        const prev = s.rooms.find(j => j.id === r.id);
        const entry: JoinedRoom = {
          id: r.id,
          name: r.name,
          seat: prev?.seat ?? null,
          ownerToken: prev?.ownerToken ?? null,
          lastOpened: Date.now(),
          ...patch
        };
        return {
          current: r.id,
          rooms: [entry, ...s.rooms.filter(j => j.id !== r.id)]
        };
      }),
    [update]
  );

  const open = useCallback(
    async (rawId: string) => {
      const id = normalizeRoomId(rawId);
      setStatus('loading');
      try {
        const r = await fetchRoom(id);
        setRoom(r);
        setStatus('ready');
        remember(r);
        return true;
      } catch {
        setStatus('not-found');
        return false;
      }
    },
    [remember]
  );

  const create = useCallback(
    async (password: string, input: NewRoomInput) => {
      const { room: r, ownerToken } = await apiCreateRoom(password, input);
      setRoom(r);
      setStatus('ready');
      remember(r, { ownerToken });
    },
    [remember]
  );

  const leave = useCallback(() => {
    update(s => ({ ...s, current: null }));
    setRoom(null);
    setStatus('idle');
  }, [update]);

  const forget = useCallback(
    (id: string) =>
      update(s => ({
        current: s.current === id ? null : s.current,
        rooms: s.rooms.filter(r => r.id !== id)
      })),
    [update]
  );

  const setSeat = useCallback(
    (seat: number | null) =>
      update(s => ({
        ...s,
        rooms: s.rooms.map(r => (r.id === s.current ? { ...r, seat } : r))
      })),
    [update]
  );

  const send = useCallback(
    async (op: RoomOp): Promise<SendResult> => {
      if (room === null) return 'error';
      try {
        setRoom(await postOp(room.id, op, room.version));
        return 'ok';
      } catch (e) {
        if (!(e instanceof RoomConflictError)) return 'error';
        setRoom(e.room);
        // Renaming does not depend on what the sender saw, so retry it
        if (op.type !== 'set-seat') return 'conflict';
        try {
          setRoom(await postOp(e.room.id, op, e.room.version));
          return 'ok';
        } catch {
          return 'error';
        }
      }
    },
    [room]
  );

  const remove = useCallback(async () => {
    if (room === null || current?.ownerToken == null) return;
    await apiDeleteRoom(room.id, current.ownerToken);
    forget(room.id);
    setRoom(null);
    setStatus('idle');
  }, [room, current, forget]);

  // Load the current room on start, or the one in a shared link
  // biome-ignore lint/correctness/useExhaustiveDependencies: only on mount
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const fromUrl = params.get('room');
    if (fromUrl !== null) {
      params.delete('room');
      const search = params.toString();
      history.replaceState(
        null,
        '',
        `${location.pathname}${search === '' ? '' : `?${search}`}${location.hash}`
      );
      dispatch({ type: 'set-current-screen', payload: 'room' });
      open(fromUrl);
    } else if (storage.current !== null) open(storage.current);
  }, []);

  // Follow updates from other players
  const roomId = room?.id ?? null;
  const versionRef = useRef(0);
  versionRef.current = room?.version ?? 0;
  useEffect(() => {
    if (roomId === null) return;
    const refresh = () =>
      fetchRoom(roomId)
        .then(r => {
          setRoom(prev =>
            prev === null || r.version >= prev.version ? r : prev
          );
          setStatus('ready');
        })
        .catch(() => setStatus('offline'));
    const unsubscribe = subscribeRoom(roomId, v => {
      if (v === null) {
        setRoom(null);
        setStatus('not-found');
      } else if (v > versionRef.current) refresh();
    });
    const onVisible = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      unsubscribe();
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [roomId]);

  const value = useMemo(
    () => ({
      joined: storage.rooms,
      current,
      room,
      status,
      open,
      create,
      leave,
      forget,
      setSeat,
      send,
      remove,
      pendingHora,
      setPendingHora
    }),
    [
      storage.rooms,
      current,
      room,
      status,
      open,
      create,
      leave,
      forget,
      setSeat,
      send,
      remove,
      pendingHora
    ]
  );

  return <RoomContext.Provider value={value}>{children}</RoomContext.Provider>;
};

export const useRoom = () => {
  const value = useContext(RoomContext);
  if (value === null) throw new Error('useRoom outside RoomProvider');
  return value;
};
