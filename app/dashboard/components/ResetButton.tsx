'use client';

import { useTransition } from 'react';
import { resetTournament } from '../actions';

export default function ResetButton() {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (!confirm('Reset all match results and points? Predictions are kept.')) return;
    startTransition(() => resetTournament());
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className="inline-flex items-center gap-1.5 rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-600 shadow-sm hover:bg-red-50 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-red-500/30 dark:border-red-800 dark:bg-zinc-900 dark:text-red-400 dark:hover:bg-red-950/20"
    >
      {isPending ? 'Resetting…' : '↺ Reset Tournament'}
    </button>
  );
}
