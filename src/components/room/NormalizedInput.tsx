import { type ComponentProps, type FC, useRef } from 'react';

type NormalizedInputProps = Omit<
  ComponentProps<'input'>,
  'value' | 'onChange'
> & {
  value: string;
  normalize: (s: string) => string;
  onChange: (value: string) => void;
};

// Rewriting the value while an IME is composing (Gboard and the iOS
// Japanese keyboard compose even plain letters) makes the keyboard commit
// the text again, so each character shows up twice. Pass the raw text
// through while composing and normalize once the composition ends.
export const NormalizedInput: FC<NormalizedInputProps> = ({
  value,
  normalize,
  onChange,
  ...props
}) => {
  const composing = useRef(false);
  return (
    <input
      autoComplete="off"
      autoCorrect="off"
      spellCheck={false}
      {...props}
      value={value}
      onCompositionStart={() => {
        composing.current = true;
      }}
      onCompositionEnd={e => {
        composing.current = false;
        onChange(normalize(e.currentTarget.value));
      }}
      onChange={e => {
        const raw = e.target.value;
        const isComposing =
          composing.current || (e.nativeEvent as InputEvent).isComposing;
        onChange(isComposing ? raw : normalize(raw));
      }}
    />
  );
};
