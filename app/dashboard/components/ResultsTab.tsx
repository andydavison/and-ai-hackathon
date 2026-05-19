import type { Team, Match, Prediction } from '@/lib/database.helpers';
import { getFlagUrl } from '@/lib/flags';

function Flag({ code }: { code: string }) {
  const url = getFlagUrl(code, 'sm');
  if (!url) return null;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt={code} width={24} height={18} className="inline-block shrink-0 rounded-sm object-cover shadow-sm" />;
}

type Props = {
  matches: Match[];
  teams: Team[];
  predictions: Prediction[];
};

function formatDate(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default function ResultsTab({ matches, teams, predictions }: Props) {
  const teamsMap = new Map(teams.map((t) => [t.id, t]));
  const predsMap = new Map(predictions.map((p) => [p.match_id, p]));

  const sorted = [...matches].sort((a, b) => a.match_number - b.match_number);

  // Group by date (using kickoff_utc date string, or "TBC" if null)
  const groups: { label: string; matches: Match[] }[] = [];
  const seen = new Map<string, Match[]>();

  for (const m of sorted) {
    const label = m.kickoff_utc
      ? formatDate(m.kickoff_utc) ?? 'TBC'
      : 'TBC';
    if (!seen.has(label)) {
      seen.set(label, []);
      groups.push({ label, matches: seen.get(label)! });
    }
    seen.get(label)!.push(m);
  }

  return (
    <div className="space-y-6">
      {groups.map(({ label, matches: dayMatches }) => (
        <div key={label}>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
            {label}
          </h3>
          <div className="space-y-2">
            {dayMatches.map((match) => {
              const home = teamsMap.get(match.home_team_id);
              const away = teamsMap.get(match.away_team_id);
              const pred = predsMap.get(match.id);
              const completed = match.status === 'completed';

              const pts = completed ? (pred?.points_awarded ?? null) : null;
              const badge =
                pts === 3
                  ? { label: '+3 Exact!', cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' }
                  : pts === 1
                  ? { label: '+1 Outcome', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' }
                  : pts === 0 && pred && completed
                  ? { label: '0 pts', cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' }
                  : null;

              return (
                <div
                  key={match.id}
                  className={`flex items-center justify-between gap-4 rounded-xl border p-3 ${
                    completed
                      ? 'border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950'
                      : 'border-zinc-100 bg-zinc-50 dark:border-zinc-800/60 dark:bg-zinc-900/40'
                  }`}
                >
                  {/* Group tag */}
                  <span className="hidden shrink-0 rounded bg-zinc-100 px-1.5 py-0.5 text-xs font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400 sm:inline">
                    Grp {match.group_letter}
                  </span>

                  {/* Teams + score */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                      {home && <Flag code={home.code} />}
                      <span className="truncate">{home?.name ?? '?'}</span>
                      <span
                        className={`shrink-0 rounded-md px-2 py-0.5 font-mono text-sm font-bold tabular-nums ${
                          completed
                            ? 'bg-zinc-100 dark:bg-zinc-800'
                            : 'bg-transparent text-zinc-400'
                        }`}
                      >
                        {completed
                          ? `${match.home_score} – ${match.away_score}`
                          : 'vs'}
                      </span>
                      <span className="truncate">{away?.name ?? '?'}</span>
                      {away && <Flag code={away.code} />}
                    </div>

                    {completed && pred && (
                      <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                        Your pick: {pred.pred_home_score} – {pred.pred_away_score}
                      </p>
                    )}
                    {completed && !pred && (
                      <p className="mt-0.5 text-xs text-zinc-400 dark:text-zinc-500">No prediction made</p>
                    )}
                    {!completed && pred && (
                      <p className="mt-0.5 text-xs text-zinc-400 dark:text-zinc-500">
                        Your pick: {pred.pred_home_score} – {pred.pred_away_score}
                      </p>
                    )}
                  </div>

                  {/* Badge or kickoff time */}
                  {badge ? (
                    <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${badge.cls}`}>
                      {badge.label}
                    </span>
                  ) : !completed && match.kickoff_utc ? (
                    <span className="shrink-0 text-xs text-zinc-400 dark:text-zinc-500">
                      {new Date(match.kickoff_utc).toLocaleTimeString('en-GB', {
                        hour: '2-digit',
                        minute: '2-digit',
                        timeZone: 'UTC',
                        timeZoneName: 'short',
                      })}
                    </span>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
