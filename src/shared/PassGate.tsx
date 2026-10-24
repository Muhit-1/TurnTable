import { type ReactNode, useState } from 'react';
import type { PlayerId } from './engine';

/**
 * Hides `children` (a player's private information) until the right person taps "ready".
 * Whenever `player` changes the gate closes again, so a device can be handed over safely.
 * Pass `enabled={false}` to skip it (for example when playing against the computer).
 */
export function PassGate({
  player,
  name,
  enabled = true,
  children,
}: {
  player: PlayerId;
  name: string;
  enabled?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState<PlayerId | null>(null);
  if (!enabled || open === player) return <>{children}</>;
  return (
    <div className="flex flex-col items-center gap-3 border-2 border-dashed rounded p-6 bg-white">
      <p className="text-sm text-neutral-700">Pass the device to {name}. Nobody else should look!</p>
      <button
        type="button"
        className="px-5 py-2 rounded border bg-neutral-900 text-white"
        onClick={() => setOpen(player)}
      >
        {name}: show my cards
      </button>
    </div>
  );
}
