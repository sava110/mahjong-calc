import { type FC, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MdContentCopy, MdShare } from 'react-icons/md';
import { inviteUrl } from '../../lib/room/api';
import type { Room } from '../../lib/room/types';
import { Sheet } from '../ui/Sheet';

interface InviteSheetProps {
  room: Room;
  pin: string;
  justCreated?: boolean;
  onClose: () => void;
}

// Like a meeting invite: a link that joins directly, plus the code and PIN
// for typing in by hand
export const InviteSheet: FC<InviteSheetProps> = ({
  room,
  pin,
  justCreated = false,
  onClose
}) => {
  const { t } = useTranslation();
  const [copied, setCopied] = useState<'text' | 'link' | null>(null);
  const url = inviteUrl(room.id, pin);
  const name = room.name || t('room.untitled');
  const text = t('room.invite-text', { name, url, code: room.id, pin });

  const copy = async (kind: 'text' | 'link') => {
    try {
      await navigator.clipboard.writeText(kind === 'text' ? text : url);
      setCopied(kind);
    } catch {
      setCopied(null);
    }
  };

  const share = async () => {
    try {
      await navigator.share({ title: name, text });
    } catch {
      // Cancelled by the user
    }
  };

  return (
    <Sheet title={t('room.invite-title')} onClose={onClose}>
      <div className="flex flex-col gap-4">
        {justCreated && (
          <p className="rounded-lg bg-emerald-100 px-3 py-2 text-sm text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-100">
            {t('room.created')}
          </p>
        )}
        <div className="grid grid-cols-2 gap-2 text-center">
          <div className="rounded-xl bg-white p-3 shadow-sm dark:bg-stone-800">
            <div className="text-xs text-stone-500">{t('room.code')}</div>
            <div className="font-mono text-2xl font-bold tracking-widest">
              {room.id}
            </div>
          </div>
          <div className="rounded-xl bg-white p-3 shadow-sm dark:bg-stone-800">
            <div className="text-xs text-stone-500">{t('room.pin')}</div>
            <div className="font-mono text-2xl font-bold tracking-widest">
              {pin}
            </div>
          </div>
        </div>
        <pre className="whitespace-pre-wrap break-all rounded-xl bg-stone-200 p-3 font-sans text-sm dark:bg-stone-800">
          {text}
        </pre>
        <div className="flex flex-col gap-2">
          {typeof navigator.share === 'function' && (
            <button
              type="button"
              className="flex items-center justify-center gap-2 rounded-lg bg-primary-700 py-3 font-bold text-white"
              onClick={share}
            >
              <MdShare />
              {t('room.share-invite')}
            </button>
          )}
          <button
            type="button"
            className="flex items-center justify-center gap-2 rounded-lg border border-stone-300 bg-white py-3 font-bold dark:border-stone-700 dark:bg-stone-950"
            onClick={() => copy('text')}
          >
            <MdContentCopy />
            {copied === 'text' ? t('room.copied') : t('room.copy-invite')}
          </button>
          <button
            type="button"
            className="flex items-center justify-center gap-2 rounded-lg border border-stone-300 bg-white py-3 dark:border-stone-700 dark:bg-stone-950"
            onClick={() => copy('link')}
          >
            <MdContentCopy />
            {copied === 'link' ? t('room.copied') : t('room.copy-link')}
          </button>
        </div>
      </div>
    </Sheet>
  );
};
