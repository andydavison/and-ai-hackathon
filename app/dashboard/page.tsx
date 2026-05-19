import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { logout } from '../auth/actions';
import { simulateNextMatch, resetTournament } from './actions';
import PredictionsTab from './components/PredictionsTab';
import ResultsTab from './components/ResultsTab';
import LeaderboardTab from './components/LeaderboardTab';
import ResetButton from './components/ResetButton';

const TABS = ['predictions', 'results', 'leaderboard'] as const;
type Tab = (typeof TABS)[number];

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; error?: string }>;
}) {
  const { tab: tabParam, error } = await searchParams;
  const activeTab: Tab = TABS.includes(tabParam as Tab) ? (tabParam as Tab) : 'predictions';

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/auth/login?next=/dashboard');

  const [teamsRes, matchesRes, predsRes, profilesRes] = await Promise.all([
    supabase.from('teams').select('*').order('group_letter').order('name'),
    supabase.from('matches').select('*').order('match_number'),
    supabase.from('predictions').select('*').eq('user_id', user.id),
    supabase.from('profiles').select('*').order('total_points', { ascending: false }),
  ]);

  const teams = teamsRes.data ?? [];
  const matches = matchesRes.data ?? [];
  const predictions = predsRes.data ?? [];
  const profiles = profilesRes.data ?? [];

  const hasScheduled = matches.some((m) => m.status === 'scheduled');

  const tabLabelMap: Record<Tab, string> = {
    predictions: 'Predictions',
    results: 'Results',
    leaderboard: 'Leaderboard',
  };

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            ⚽ World Cup 2026
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Prediction Challenge</p>
        </div>
        <form action={logout}>
          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 shadow-sm hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Sign out
          </button>
        </form>
      </header>

      {error && (
        <p
          role="alert"
          className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300"
        >
          {error}
        </p>
      )}

      {/* Admin controls */}
      <div className="mt-4 flex justify-end gap-2">
        {hasScheduled && (
          <form action={simulateNextMatch}>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-600/30"
            >
              🎲 Simulate Next Match
            </button>
          </form>
        )}
        <ResetButton />
      </div>

      {/* Tab nav */}
      <nav className="mt-6 flex gap-1 rounded-xl bg-zinc-100 p-1 dark:bg-zinc-800">
        {TABS.map((tab) => (
          <a
            key={tab}
            href={`/dashboard?tab=${tab}`}
            className={`flex-1 rounded-lg py-2 text-center text-sm font-medium transition-colors ${
              activeTab === tab
                ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-900 dark:text-zinc-100'
                : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200'
            }`}
          >
            {tabLabelMap[tab]}
          </a>
        ))}
      </nav>

      {/* Tab content */}
      <section className="mt-6">
        {activeTab === 'predictions' && (
          <PredictionsTab matches={matches} teams={teams} predictions={predictions} />
        )}
        {activeTab === 'results' && (
          <ResultsTab matches={matches} teams={teams} predictions={predictions} />
        )}
        {activeTab === 'leaderboard' && (
          <LeaderboardTab profiles={profiles} currentUserId={user.id} />
        )}
      </section>
    </main>
  );
}
