/**
 * SignalMeter — the app's signature element. A clean, abstract S-meter / carrier
 * indicator (not a skeuomorphic needle): rising bars lit to a strength level, in
 * dial-amber when a node is reachable, teal when linked remotely, dim when down.
 * The peak bar can pulse to read "live". This same motif carries into the messaging
 * surfaces (per-thread carrier / unread activity).
 */
export type MeterState = 'on' | 'link' | 'down';

export function SignalMeter({
  level,
  state = 'on',
  live = false,
  bars = 4,
}: {
  /** 0..bars — how many bars are lit (signal strength / reachability). */
  level: number;
  state?: MeterState;
  /** subtle carrier pulse on the peak lit bar (e.g. the active node). */
  live?: boolean;
  bars?: number;
}) {
  const label =
    state === 'down' || level <= 0
      ? 'no signal — unreachable'
      : `signal ${level} of ${bars}${state === 'link' ? ', linked remotely' : ''}`;

  return (
    <span
      className={`smeter smeter--${state}${live ? ' smeter--live' : ''}`}
      role="img"
      aria-label={label}
    >
      {Array.from({ length: bars }, (_, i) => {
        const lit = i < level && state !== 'down';
        const peak = lit && i === level - 1;
        return (
          <span
            key={i}
            className={`smeter__bar${lit ? ' is-lit' : ''}${peak ? ' is-peak' : ''}`}
            style={{ height: 7 + i * 4 }}
          />
        );
      })}
    </span>
  );
}
