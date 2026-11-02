import { describe, expect, test } from 'vitest';
import { normalizeRoomId } from './local';

describe('normalizeRoomId', () => {
  test('uppercases and drops separators', () => {
    expect(normalizeRoomId('ab-c 12')).toBe('ABC12');
  });

  test('accepts full-width letters and digits from Japanese keyboards', () => {
    expect(normalizeRoomId('ａｂｃ１２３')).toBe('ABC123');
  });
});
