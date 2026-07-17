'use client';

// Run 54 — the one-time hint that teaches the completion circle.
//
// Shown above the week list (not below it, where the old hint text sat — by
// then the person has already given up) and only until it is dismissed. The
// dismissal is stamped on TrackEnrollment.helpSeenAt rather than localStorage
// so it follows the participant across devices; a Guest who opens their portal
// link on a phone and later a laptop should not be taught twice.
//
// Dismissal is fire-safe: if the stamp write fails the card still closes for
// this session. Nagging someone because a network call failed is worse than
// showing the hint again on their next visit.

interface TrackCoachmarkProps {
  onDismiss: () => void;
}

export default function TrackCoachmark({ onDismiss }: TrackCoachmarkProps) {
  return (
    <div className="mb-3 rounded-xl border border-brand-200 bg-brand-50 px-3.5 py-3 flex items-start gap-3">
      <span className="flex-shrink-0 w-7 h-7 rounded-full bg-white border-2 border-church-300 text-church-500 flex items-center justify-center text-xs font-bold mt-0.5">
        1
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-brand-800">Tap the numbered circle to mark a week done</p>
        <p className="text-xs text-brand-700 mt-0.5 leading-relaxed">
          It turns into a green check ✓ and your progress bar moves. Tap the week&apos;s
          name instead to open its content and write your reflections.
        </p>
        <button
          type="button"
          onClick={onDismiss}
          className="text-xs font-semibold text-brand-700 hover:text-brand-900 underline mt-2"
        >
          Got it
        </button>
      </div>
    </div>
  );
}
