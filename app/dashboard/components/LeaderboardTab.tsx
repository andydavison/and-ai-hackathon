import type { Profile } from '@/lib/database.helpers';

type Props = {
  profiles: Profile[];
  currentUserId: string;
};

export default function LeaderboardTab({ profiles, currentUserId }: Props) {
  const sorted = [...profiles].sort((a, b) => (b.total_points ?? 0) - (a.total_points ?? 0));

  if (sorted.length === 0) {
    return (
      <div className="py-16 text-center text-zinc-500 dark:text-zinc-400">
        <p className="text-4xl">🏆</p>
        <p className="mt-3 text-sm">No players yet. Sign up some friends!</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
            <th className="px-4 py-3 text-left font-semibold text-zinc-500 dark:text-zinc-400">Rank</th>
            <th className="px-4 py-3 text-left font-semibold text-zinc-500 dark:text-zinc-400">Player</th>
            <th className="px-4 py-3 text-right font-semibold text-zinc-500 dark:text-zinc-400">Points</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {sorted.map((profile, idx) => {
            const isMe = profile.id === currentUserId;
            const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : null;
            return (
              <tr
                key={profile.id}
                className={isMe ? 'bg-blue-50 dark:bg-blue-950/20' : ''}
              >
                <td className="px-4 py-3 text-zinc-500 dark:text-zinc-400">
                  {medal ?? `#${idx + 1}`}
                </td>
                <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-100">
                  {profile.full_name || 'Anonymous'}
                  {isMe && (
                    <span className="ml-2 rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700 dark:bg-blue-900/40 dark:text-blue-400">
                      you
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-right font-bold tabular-nums text-zinc-900 dark:text-zinc-100">
                  {profile.total_points ?? 0}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
