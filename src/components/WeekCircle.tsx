'use client';

// Run 54 — the completion control for a CORE week, shared by My Tracks and the
// token portal so the two surfaces can never drift apart again.
//
// Why this exists: before Run 54 the control was a flat grey disc showing the
// week number, styled `bg-church-100 text-church-400` with `hover:ring-2` as
// its only affordance. On a phone there is no hover, and ~95% of participants
// are on phones — so the control looked exactly like a list index and people
// did not know it was tappable. The number now sits inside a hollow ring
// (a checkbox people recognise), and the pressed state is driven by `active:`
// rather than `hover:` so it responds to a real finger.

interface WeekCircleProps {
  weekNumber: number;
  done: boolean;
  busy: boolean;
  /** Enrollment is ACTIVE — only then can progress be written. */
  interactive: boolean;
  onToggle: () => void;
  /** Portal uses a larger target than the denser My Tracks list. */
  size?: 'sm' | 'md';
}

export default function WeekCircle({
  weekNumber, done, busy, interactive, onToggle, size = 'sm',
}: WeekCircleProps) {
  const box = size === 'md' ? 'w-9 h-9 text-sm' : 'w-7 h-7 text-xs';

  // Done: solid green, unmistakable. Not done + interactive: hollow ring with
  // a visible border so it reads as an empty checkbox. Not interactive
  // (PAUSED/COMPLETED/WITHDRAWN): flat and quiet — nothing to press.
  const look = done
    ? 'bg-green-500 border-2 border-green-500 text-white'
    : interactive
      ? 'bg-white border-2 border-church-300 text-church-500 active:bg-green-50 active:border-green-400 active:scale-95 hover:border-green-400 hover:text-green-600'
      : 'bg-church-100 border-2 border-church-100 text-church-400 cursor-default';

  return (
    <button
      type="button"
      onClick={ev => { ev.stopPropagation(); onToggle(); }}
      disabled={!interactive || busy}
      aria-pressed={done}
      aria-label={done ? `Mark week ${weekNumber} as not complete` : `Mark week ${weekNumber} complete`}
      title={interactive ? (done ? 'Tap to un-mark this week' : 'Tap to mark this week complete') : undefined}
      className={`${box} ${look} rounded-full flex items-center justify-center font-bold flex-shrink-0 transition-all duration-150`}
    >
      {busy ? '…' : done ? '✓' : weekNumber}
    </button>
  );
}
