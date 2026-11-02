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
  RoomApiError,
  RoomConflictError,
  changePin as apiChangePin,
  createRoom as apiCreateRoom,
  deleteRoom as apiDeleteRoom,
  fetchRoom,
  postOp,
  subscribeRoom
} from '../lib/room/api';
import {
  type JoinedRoom,
  type SeatChoice,
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

export type OpenResult =
  | 'ok'
  | 'not-found'
  | 'wrong-pin'
  | 'pin-changed'
  | 'locked'
  | 'offline';

// Shown on the lobby when a room could not be opened
export interface JoinPrompt {
  id: string;
  error: Exclude<OpenResult, 'ok'> | null;
}

interface RoomContextValue {
  joined: JoinedRoom[];
  current: JoinedRoom | null;
  room: Room | null;
  status: 'idle' | 'loading' | 'ready' | 'offline';
  joinPrompt: JoinPrompt | null;
  // Set after creating a room, so the invite is shown once
  showInvite: boolean;
  setShowInvite: (show: boolean) => void;
  open: (id: string, pin: string) => Promise<OpenResult>;
  create: (pin: string, input: NewRoomInput) => Promise<void>;
  leave: () => void;
  forget: (id: string) => void;
  setSeat: (seat: SeatChoice | null) => void;
  send: (op: RoomOp) => Promise<SendResult>;
  changePin: (pin: string) => Promise<void>;
  remove: () => Promise<void>;
  pendingHora: HoraPrefill | null;
  setPendingHora: (prefill: HoraPrefill | null) => void;
}

const RoomContext = createContext<RoomContextValue | null>(null);

const openError = (e: unknown): Exclude<OpenResult, 'ok'> =>
  e instanceof RoomApiError
    ? e.status === 404
      ? 'not-found'
      : e.status === 403
        ? 'wrong-pin'
        : e.status === 429
          ? 'locked'
          : 'offline'
    : 'offline';

export const RoomProvider: FC<{ children?: React.ReactNode }> = ({
  children
}) => {
  const [, dispatch] = useStore();
  const [storage, setStorage] = useState(loadRooms);
  const [room, setRoom] = useState<Room | null>(null);
  const [status, setStatus] = useState<RoomContextValue['status']>('idle');
  const [joinPrompt, setJoinPrompt] = useState<JoinPrompt | null>(null);
  const [showInvite, setShowInvite] = useState(false);
  const [pendingHora, setPendingHora] = useState<HoraPrefill | null>(null);
  // Bumped to reconnect the update stream
  const [subscription, setSubscription] = useState(0);

  const current = storage.rooms.find(r => r.id === storage.current) ?? null;
  const pin = current?.pin ?? '';
  const pinRef = useRef(pin);
  pinRef.current = pin;

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
          pin: prev?.pin ?? null,
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

  // Back to the lobby, asking for the code and PIN again
  const kick = useCallback(
    (id: string, error: JoinPrompt['error']) => {
      // A rejected PIN is forgotten, so the room asks for it next time
      const forgetPin = error === 'wrong-pin' || error === 'pin-changed';
      update(s => ({
        current: null,
        rooms: s.rooms.map(r =>
          r.id === id && forgetPin ? { ...r, pin: null } : r
        )
      }));
      setRoom(null);
      setStatus('idle');
      setJoinPrompt({ id, error });
    },
    [update]
  );

  const open = useCallback(
    async (rawId: string, roomPin: string): Promise<OpenResult> => {
      const id = normalizeRoomId(rawId);
      setStatus('loading');
      try {
        const r = await fetchRoom(id, roomPin);
        setRoom(r);
        setStatus('ready');
        setJoinPrompt(null);
        remember(r, { pin: roomPin });
        return 'ok';
      } catch (e) {
        setStatus('idle');
        return openError(e);
      }
    },
    [remember]
  );

  const create = useCallback(
    async (roomPin: string, input: NewRoomInput) => {
      const { room: r, ownerToken } = await apiCreateRoom(roomPin, input);
      setRoom(r);
      setStatus('ready');
      setJoinPrompt(null);
      setShowInvite(true);
      remember(r, { ownerToken, pin: roomPin });
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

  const patchCurrent = useCallback(
    (patch: Partial<JoinedRoom>) =>
      update(s => ({
        ...s,
        rooms: s.rooms.map(r => (r.id === s.current ? { ...r, ...patch } : r))
      })),
    [update]
  );

  const setSeat = useCallback(
    (seat: SeatChoice | null) => patchCurrent({ seat }),
    [patchCurrent]
  );

  const send = useCallback(
    async (op: RoomOp): Promise<SendResult> => {
      if (room === null) return 'error';
      try {
        setRoom(await postOp(room.id, pin, op, room.version));
        return 'ok';
      } catch (e) {
        if (e instanceof RoomApiError && e.status === 403) {
          kick(room.id, 'pin-changed');
          return 'error';
        }
        if (!(e instanceof RoomConflictError)) return 'error';
        setRoom(e.room);
        // Renaming does not depend on what the sender saw, so retry it
        if (op.type !== 'set-seat') return 'conflict';
        try {
          setRoom(await postOp(e.room.id, pin, op, e.room.version));
          return 'ok';
        } catch {
          return 'error';
        }
      }
    },
    [room, pin, kick]
  );

  const changePin = useCallback(
    async (newPin: string) => {
      if (room === null || current?.ownerToken == null) return;
      const oldPin = pin;
      // Saved first, so the notice the server sends to everyone reloads this
      // device with the new PIN
      patchCurrent({ pin: newPin });
      try {
        await apiChangePin(room.id, current.ownerToken, newPin);
      } catch (e) {
        patchCurrent({ pin: oldPin });
        throw e;
      }
    },
    [room, current, pin, patchCurrent]
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
      const urlPin = params.get('pin');
      params.delete('room');
      params.delete('pin');
      const search = params.toString();
      history.replaceState(
        null,
        '',
        `${location.pathname}${search === '' ? '' : `?${search}`}${location.hash}`
      );
      dispatch({ type: 'set-current-screen', payload: 'room' });
      const id = normalizeRoomId(fromUrl);
      if (urlPin === null) setJoinPrompt({ id, error: null });
      else
        open(id, urlPin).then(result => {
          if (result !== 'ok') kick(id, result);
        });
    } else if (current !== null) {
      const id = current.id;
      if (current.pin === null) kick(id, null);
      else
        open(id, current.pin).then(result => {
          if (result === 'offline') setStatus('offline');
          else if (result !== 'ok') kick(id, result);
        });
    }
  }, []);

  // Follow updates from other players
  const roomId = room?.id ?? null;
  const versionRef = useRef(0);
  versionRef.current = room?.version ?? 0;
  // biome-ignore lint/correctness/useExhaustiveDependencies: `subscription` is bumped to reconnect
  useEffect(() => {
    if (roomId === null) return;
    let reconnect: ReturnType<typeof setTimeout> | undefined;
    const refresh = () =>
      fetchRoom(roomId, pinRef.current).then(
        r => {
          setRoom(prev =>
            prev === null || r.version >= prev.version ? r : prev
          );
          setStatus('ready');
          return true;
        },
        e => {
          const error = openError(e);
          if (error === 'offline') setStatus('offline');
          else kick(roomId, error === 'wrong-pin' ? 'pin-changed' : error);
          return false;
        }
      );
    const unsubscribe = subscribeRoom(roomId, pinRef.current, notice => {
      switch (notice.type) {
        case 'version':
          if (notice.version > versionRef.current) refresh();
          break;
        case 'deleted':
          kick(roomId, 'not-found');
          break;
        // The stream was closed: by a PIN change, or by an error
        case 'pin-changed':
        case 'closed':
          reconnect = setTimeout(
            () =>
              refresh().then(ok => {
                if (ok) setSubscription(n => n + 1);
              }),
            notice.type === 'closed' ? 5000 : 0
          );
          break;
      }
    });
    const onVisible = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearTimeout(reconnect);
      unsubscribe();
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [roomId, subscription, kick]);

  const value = useMemo(
    () => ({
      joined: storage.rooms,
      current,
      room,
      status,
      joinPrompt,
      showInvite,
      setShowInvite,
      open,
      create,
      leave,
      forget,
      setSeat,
      send,
      changePin,
      remove,
      pendingHora,
      setPendingHora
    }),
    [
      storage.rooms,
      current,
      room,
      status,
      joinPrompt,
      showInvite,
      open,
      create,
      leave,
      forget,
      setSeat,
      send,
      changePin,
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
