import { type FC, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useRoom } from '../../contexts/room';
import { randomPin } from '../../lib/room/api';
import { isPin } from '../../lib/room/ops';
import { Button } from '../ui/Button';
import { Sheet } from '../ui/Sheet';
import { PinInput } from './PinInput';

export const ChangePinSheet: FC<{ onDone: (changed: boolean) => void }> = ({
  onDone
}) => {
  const { t } = useTranslation();
  const { changePin } = useRoom();
  const [pin, setPin] = useState(randomPin);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    setError(false);
    try {
      await changePin(pin);
      onDone(true);
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet
      title={t('room.change-pin')}
      onClose={() => onDone(false)}
      footer={
        <>
          <div className="flex-1">
            <Button onClick={() => onDone(false)}>{t('room.cancel')}</Button>
          </div>
          <button
            type="button"
            disabled={busy || !isPin(pin)}
            className="rounded-lg bg-primary-700 px-6 py-2 font-bold text-white disabled:opacity-30"
            onClick={submit}
          >
            {t('room.save')}
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <p className="text-sm text-stone-600 dark:text-stone-400">
          {t('room.change-pin-help')}
        </p>
        <PinInput value={pin} onChange={setPin} />
        {error && (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            {t('room.send-error')}
          </p>
        )}
      </div>
    </Sheet>
  );
};
