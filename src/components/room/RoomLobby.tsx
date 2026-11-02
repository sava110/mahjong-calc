import { type FC, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MdClose, MdNavigateNext } from 'react-icons/md';
import { useRoom } from '../../contexts/room';
import { normalizeRoomId } from '../../lib/room/local';
import { CreateRoomForm } from './CreateRoomForm';

const cardClasses =
  'flex flex-col gap-3 rounded-xl bg-white p-3 shadow-sm dark:bg-stone-800';

export const RoomLobby: FC = () => {
  const { t } = useTranslation();
  const { joined, open, forget, status } = useRoom();
  const [code, setCode] = useState('');
  const [creating, setCreating] = useState(false);
  const [notFound, setNotFound] = useState(false);

  const join = async (id: string) => {
    setNotFound(false);
    if (!(await open(id))) setNotFound(true);
  };

  return (
    <div className="flex flex-col gap-3 p-3 pr-[max(0.75rem,env(safe-area-inset-right))] pl-[max(0.75rem,env(safe-area-inset-left))] md:mx-auto md:max-w-xl">
      <section className={cardClasses}>
        <h2 className="text-lg font-bold">{t('room.join')}</h2>
        <form
          className="flex gap-2"
          onSubmit={e => {
            e.preventDefault();
            join(code);
          }}
        >
          <input
            className="min-w-0 flex-1 rounded-lg border border-stone-300 bg-white px-3 py-3 font-mono text-lg tracking-widest uppercase dark:border-stone-700 dark:bg-stone-950"
            value={code}
            maxLength={6}
            autoCapitalize="characters"
            autoComplete="off"
            placeholder={t('room.code-placeholder')}
            aria-label={t('room.code')}
            onChange={e => setCode(normalizeRoomId(e.target.value))}
          />
          <button
            type="submit"
            disabled={code.length !== 6 || status === 'loading'}
            className="rounded-lg bg-primary-700 px-5 font-bold text-white disabled:opacity-30"
          >
            {t('room.join-button')}
          </button>
        </form>
        {notFound && (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            {t('room.not-found')}
          </p>
        )}
      </section>

      {joined.length > 0 && (
        <section className={cardClasses}>
          <h2 className="font-bold">{t('room.recent')}</h2>
          <ul className="flex flex-col divide-y divide-stone-200 dark:divide-stone-700">
            {joined.map(r => (
              <li key={r.id} className="flex items-center">
                <button
                  type="button"
                  className="flex min-w-0 flex-1 items-center gap-2 py-3 text-left"
                  onClick={() => join(r.id)}
                >
                  <span className="min-w-0 flex-1 truncate">
                    {r.name || t('room.untitled')}
                  </span>
                  <span className="font-mono text-sm text-stone-500">
                    {r.id}
                  </span>
                  <MdNavigateNext className="shrink-0 text-stone-400" />
                </button>
                <button
                  type="button"
                  aria-label={t('room.forget')}
                  className="p-3 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
                  onClick={() => forget(r.id)}
                >
                  <MdClose />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className={cardClasses}>
        {creating ? (
          <>
            <h2 className="text-lg font-bold">{t('room.create-title')}</h2>
            <CreateRoomForm onCancel={() => setCreating(false)} />
          </>
        ) : (
          <>
            <p className="text-sm text-stone-600 dark:text-stone-400">
              {t('room.create-help')}
            </p>
            <button
              type="button"
              className="rounded-lg border border-primary-700 py-3 font-bold text-primary-700 dark:border-primary-400 dark:text-primary-300"
              onClick={() => setCreating(true)}
            >
              {t('room.create-title')}
            </button>
          </>
        )}
      </section>
    </div>
  );
};
