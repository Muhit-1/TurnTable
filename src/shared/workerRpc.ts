/** Message shapes shared by the page and a worker created with createWorkerRpc. */
export interface RpcRequest<Req> {
  id: number;
  req: Req;
}
export interface RpcResponse<Res> {
  id: number;
  res: Res;
}

/**
 * Turns a Web Worker into an async function. If the browser has no Worker, the worker fails, or it does not
 * answer in time, the request is computed on the main thread with `fallback` instead.
 */
export function createWorkerRpc<Req, Res>(
  spawn: () => Worker,
  fallback: (req: Req) => Res | Promise<Res>,
  timeoutMs = 20000,
): (req: Req) => Promise<Res> {
  let worker: Worker | null = null;
  let failed = false;
  let nextId = 1;
  const waiting = new Map<number, (res: Res) => void>();

  const get = (): Worker | null => {
    if (failed || typeof Worker === 'undefined') return null;
    if (worker) return worker;
    try {
      const w = spawn();
      w.onmessage = (e: MessageEvent<RpcResponse<Res>>) => {
        waiting.get(e.data.id)?.(e.data.res);
        waiting.delete(e.data.id);
      };
      w.onerror = () => {
        failed = true;
        worker = null;
      };
      worker = w;
    } catch {
      failed = true;
    }
    return worker;
  };

  return (req: Req) => {
    const w = get();
    if (!w) return Promise.resolve(fallback(req));
    return new Promise<Res>((resolve) => {
      const id = nextId++;
      const timer = setTimeout(() => {
        waiting.delete(id);
        resolve(fallback(req));
      }, timeoutMs);
      waiting.set(id, (res) => {
        clearTimeout(timer);
        resolve(res);
      });
      const message: RpcRequest<Req> = { id, req };
      w.postMessage(message);
    });
  };
}

/** Wires a worker's onmessage to a pure handler (call this inside the worker file). */
export function serveRpc<Req, Res>(
  scope: { onmessage: unknown; postMessage: (m: unknown) => void },
  handle: (req: Req) => Res,
) {
  scope.onmessage = (event: MessageEvent<RpcRequest<Req>>) => {
    const response: RpcResponse<Res> = { id: event.data.id, res: handle(event.data.req) };
    scope.postMessage(response);
  };
}
