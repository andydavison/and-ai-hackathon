'use client';

import { useState, useTransition } from 'react';
import type { Team, Match, Prediction } from '@/lib/database.helpers';
import { getFlagUrl } from '@/lib/flags';
import { upsertPredictions } from '../actions';

type Props = {
  matches: Match[];
  teams: Team[];
  predictions: Prediction[];
};

type LocalPred = { matchId: number; predHomeScore: number; predAwayScore: number };

function Flag({ code, size = 'sm' }: { code: string; size?: 'sm' | 'md' | 'lg' }) {
  const url = getFlagUrl(code, size);
  if (!url) return <span className="text-2xl">🏳️</span>;
  const dims = { sm: [24, 18], md: [40, 30], lg: [64, 48] }[size];
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt={code} width={dims[0]} height={dims[1]} className="inline-block rounded-sm object-cover shadow-sm" />;
}

export default function PredictionsTab({ matches, teams, predictions }: Props) {
  const teamsMap = new Map(teams.map((t) => [t.id, t]));
  const predsMap = new Map(predictions.map((p) => [p.match_id, p]));

  const groups = [...new Set(matches.map((m) => m.group_letter))].sort();
  const matchesByGroup = new Map<string, Match[]>();
  for (const g of groups) {
    matchesByGroup.set(g, matches.filter((m) => m.group_letter === g).sort((a, b) => a.match_number - b.match_number));
  }

  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const [matchIndex, setMatchIndex] = useState(0);
  const [localPreds, setLocalPreds] = useState<LocalPred[]>([]);
  const [isPending, startTransition] = useTransition();

  function openModal(group: string) {
    const groupMatches = matchesByGroup.get(group) ?? [];
    setLocalPreds(
      groupMatches.map((m) => {
        const existing = predsMap.get(m.id);
        return {
          matchId: m.id,
          predHomeScore: existing?.pred_home_score ?? 0,
          predAwayScore: existing?.pred_away_score ?? 0,
        };
      })
    );
    setMatchIndex(0);
    setOpenGroup(group);
  }

  function closeModal() {
    setOpenGroup(null);
  }

  function updateScore(field: 'predHomeScore' | 'predAwayScore', value: number) {
    setLocalPreds((prev) =>
      prev.map((p, i) => (i === matchIndex ? { ...p, [field]: Math.max(0, Math.min(20, value)) } : p))
    );
  }

  function handleSubmit() {
    if (!openGroup) return;
    startTransition(async () => {
      await upsertPredictions(openGroup, localPreds);
      closeModal();
    });
  }

  const groupMatches = openGroup ? (matchesByGroup.get(openGroup) ?? []) : [];
  const currentMatch = groupMatches[matchIndex];
  const currentPred = localPreds[matchIndex];

  function predCount(group: string) {
    const gm = matchesByGroup.get(group) ?? [];
    return gm.filter((m) => predsMap.has(m.id)).length;
  }

  // Get the 4 unique teams in a group
  function groupTeams(group: string): Team[] {
    const seen = new Set<number>();
    const result: Team[] = [];
    for (const m of matchesByGroup.get(group) ?? []) {
      for (const id of [m.home_team_id, m.away_team_id]) {
        if (!seen.has(id)) {
          seen.add(id);
          const t = teamsMap.get(id);
          if (t) result.push(t);
        }
      }
    }
    return result;
  }

  return (
    <div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {groups.map((group) => {
          const gMatches = matchesByGroup.get(group) ?? [];
          const count = predCount(group);
          const complete = count === gMatches.length && gMatches.length > 0;
          const teamList = groupTeams(group);
          return (
            <button
              key={group}
              onClick={() => openModal(group)}
              className="rounded-xl border border-zinc-200 bg-white p-4 text-left shadow-sm transition-all hover:border-zinc-400 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-600"
            >
              <div className="flex items-center justify-between">
                <span className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                  Group {group}
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                    complete
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                      : count > 0
                      ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                      : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400'
                  }`}
                >
                  {count}/{gMatches.length}
                </span>
              </div>
              <ul className="mt-3 space-y-1.5">
                {teamList.map((team) => (
                  <li key={team.id} className="flex items-center gap-2">
                    <Flag code={team.code} size="sm" />
                    <span className="text-xs text-zinc-600 dark:text-zinc-400">{team.name}</span>
                  </li>
                ))}
              </ul>
            </button>
          );
        })}
      </div>

      {/* Prediction Modal */}
      {openGroup && currentMatch && currentPred && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl dark:bg-zinc-900">
            <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
              <div>
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                  Group {openGroup}
                </h2>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  Match {matchIndex + 1} of {groupMatches.length}
                </p>
              </div>
              <button
                onClick={closeModal}
                className="rounded-lg p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
              >
                ✕
              </button>
            </div>

            <div className="px-6 py-6">
              <MatchCard
                homeTeam={teamsMap.get(currentMatch.home_team_id)}
                awayTeam={teamsMap.get(currentMatch.away_team_id)}
                pred={currentPred}
                onHomeChange={(v) => updateScore('predHomeScore', v)}
                onAwayChange={(v) => updateScore('predAwayScore', v)}
              />
            </div>

            {/* Progress dots */}
            <div className="flex justify-center gap-1.5 pb-2">
              {groupMatches.map((_, i) => (
                <span
                  key={i}
                  className={`h-2 w-2 rounded-full ${
                    i === matchIndex
                      ? 'bg-zinc-900 dark:bg-zinc-100'
                      : i < matchIndex
                      ? 'bg-zinc-400'
                      : 'bg-zinc-200 dark:bg-zinc-700'
                  }`}
                />
              ))}
            </div>

            <div className="flex gap-3 border-t border-zinc-200 px-6 py-4 dark:border-zinc-800">
              {matchIndex > 0 && (
                <button
                  onClick={() => setMatchIndex((i) => i - 1)}
                  className="flex-1 rounded-lg border border-zinc-300 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  Back
                </button>
              )}
              {matchIndex < groupMatches.length - 1 ? (
                <button
                  onClick={() => setMatchIndex((i) => i + 1)}
                  className="flex-1 rounded-lg bg-zinc-900 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                >
                  Next Match
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={isPending}
                  className="flex-1 rounded-lg bg-emerald-600 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
                >
                  {isPending ? 'Saving…' : 'Submit Group'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MatchCard({
  homeTeam,
  awayTeam,
  pred,
  onHomeChange,
  onAwayChange,
}: {
  homeTeam: Team | undefined;
  awayTeam: Team | undefined;
  pred: LocalPred;
  onHomeChange: (v: number) => void;
  onAwayChange: (v: number) => void;
}) {
  const homeStrength = homeTeam?.strength ?? 75;
  const awayStrength = awayTeam?.strength ?? 75;
  const total = homeStrength + awayStrength;
  const homeProb = Math.round((homeStrength / total) * 100);
  const awayProb = 100 - homeProb;

  return (
    <div className="space-y-5">
      {/* Teams row */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1 text-center">
          {homeTeam && <Flag code={homeTeam.code} size="lg" />}
          <div className="mt-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            {homeTeam?.name ?? '—'}
          </div>
          <div className="text-xs text-zinc-400">{homeTeam?.code}</div>
        </div>

        <div className="flex items-center gap-2">
          <ScoreInput value={pred.predHomeScore} onChange={onHomeChange} />
          <span className="text-lg font-bold text-zinc-400">–</span>
          <ScoreInput value={pred.predAwayScore} onChange={onAwayChange} />
        </div>

        <div className="flex-1 text-center">
          {awayTeam && <Flag code={awayTeam.code} size="lg" />}
          <div className="mt-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            {awayTeam?.name ?? '—'}
          </div>
          <div className="text-xs text-zinc-400">{awayTeam?.code}</div>
        </div>
      </div>

      {/* Win probability bar */}
      <div>
        <div className="mb-1 flex justify-between text-xs text-zinc-500 dark:text-zinc-400">
          <span>{homeProb}% win</span>
          <span className="text-zinc-400">odds</span>
          <span>{awayProb}% win</span>
        </div>
        <div className="flex h-2 overflow-hidden rounded-full">
          <div className="bg-blue-500" style={{ width: `${homeProb}%` }} />
          <div className="bg-red-500" style={{ width: `${awayProb}%` }} />
        </div>
      </div>
    </div>
  );
}

function ScoreInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <input
      type="number"
      min={0}
      max={20}
      value={value}
      onChange={(e) => onChange(parseInt(e.target.value, 10) || 0)}
      className="w-12 rounded-lg border border-zinc-300 bg-white py-2 text-center text-xl font-bold text-zinc-900 shadow-sm focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
    />
  );
}
