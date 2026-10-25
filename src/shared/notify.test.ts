import { describe, expect, it, vi } from 'vitest';
import { notify } from './notify';

describe('notify', () => {
  it('delivers toasts and game-over events to subscribers until they unsubscribe', () => {
    const seen = vi.fn();
    const off = notify.subscribe(seen);
    notify.toast('hello');
    notify.gameOver('won');
    off();
    notify.toast('ignored');
    expect(seen.mock.calls.map((c) => c[0])).toEqual([
      { kind: 'toast', message: 'hello' },
      { kind: 'gameover', result: 'won' },
    ]);
  });
});
