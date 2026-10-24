// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { createWorkerRpc } from './workerRpc';

describe('createWorkerRpc', () => {
  it('uses the fallback when the browser has no Worker', async () => {
    expect(typeof Worker).toBe('undefined');
    const call = createWorkerRpc<number, number>(
      () => {
        throw new Error('should not spawn');
      },
      (n) => n * 2,
    );
    expect(await call(21)).toBe(42);
  });

  it('uses a worker when there is one, and falls back if it never answers', async () => {
    const posted: unknown[] = [];
    class Silent {
      onmessage: unknown = null;
      onerror: unknown = null;
      postMessage(m: unknown) {
        posted.push(m);
      }
    }
    (globalThis as { Worker?: unknown }).Worker = Silent;
    try {
      const call = createWorkerRpc<number, number>(
        () => new Silent() as unknown as Worker,
        (n) => n + 1,
        30,
      );
      expect(await call(1)).toBe(2); // timed out, computed locally
      expect(posted).toEqual([{ id: 1, req: 1 }]);
    } finally {
      (globalThis as { Worker?: unknown }).Worker = undefined;
      // biome-ignore lint/performance/noDelete: restore the original (absent) global
      delete (globalThis as { Worker?: unknown }).Worker;
    }
  });

  it('resolves with the worker response when it answers', async () => {
    class Echo {
      onmessage: ((e: MessageEvent) => void) | null = null;
      onerror: unknown = null;
      postMessage(m: { id: number; req: number }) {
        queueMicrotask(() => this.onmessage?.({ data: { id: m.id, res: m.req * 10 } } as MessageEvent));
      }
    }
    (globalThis as { Worker?: unknown }).Worker = Echo;
    try {
      const call = createWorkerRpc<number, number>(
        () => new Echo() as unknown as Worker,
        () => -1,
      );
      expect(await call(4)).toBe(40);
    } finally {
      // biome-ignore lint/performance/noDelete: restore the original (absent) global
      delete (globalThis as { Worker?: unknown }).Worker;
    }
  });
});
