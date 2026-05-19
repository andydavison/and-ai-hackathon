'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient, createAdminClient } from '@/lib/supabase/server';

type PredictionInput = {
  matchId: number;
  predHomeScore: number;
  predAwayScore: number;
};

export async function upsertPredictions(
  _groupLetter: string,
  predictions: PredictionInput[]
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/auth/login?next=/dashboard');

  const rows = predictions.map((p) => ({
    user_id: user.id,
    match_id: p.matchId,
    pred_home_score: p.predHomeScore,
    pred_away_score: p.predAwayScore,
    points_awarded: 0,
  }));

  const { error } = await supabase
    .from('predictions')
    .upsert(rows, { onConflict: 'user_id,match_id' });

  if (error) {
    redirect('/dashboard?error=' + encodeURIComponent(error.message));
  }

  revalidatePath('/dashboard');
}

function calculatePoints(
  predHome: number,
  predAway: number,
  actualHome: number,
  actualAway: number
): number {
  if (predHome === actualHome && predAway === actualAway) return 3;
  if (Math.sign(predHome - predAway) === Math.sign(actualHome - actualAway)) return 1;
  return 0;
}

function weightedGoals(myStrength: number, oppStrength: number): number {
  const mean = (1.5 * myStrength) / (myStrength + oppStrength) * 2;
  // Sum two uniform samples to get a triangle-ish distribution around the mean
  return Math.floor((Math.random() * mean + Math.random() * mean) / 2 + 0.5);
}

export async function simulateNextMatch() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/auth/login?next=/dashboard');

  const admin = createAdminClient();

  // Find earliest scheduled match
  const { data: match, error: matchError } = await admin
    .from('matches')
    .select('*, home_team:teams!matches_home_team_id_fkey(strength), away_team:teams!matches_away_team_id_fkey(strength)')
    .eq('status', 'scheduled')
    .order('match_number', { ascending: true })
    .limit(1)
    .single();

  if (matchError || !match) {
    redirect('/dashboard?error=' + encodeURIComponent('No scheduled matches remaining'));
  }

  const homeStrength = (match.home_team as { strength: number } | null)?.strength ?? 75;
  const awayStrength = (match.away_team as { strength: number } | null)?.strength ?? 75;

  const homeScore = weightedGoals(homeStrength, awayStrength);
  const awayScore = weightedGoals(awayStrength, homeStrength);

  const { error: updateError } = await admin
    .from('matches')
    .update({ home_score: homeScore, away_score: awayScore, status: 'completed' })
    .eq('id', match.id);

  if (updateError) {
    redirect('/dashboard?error=' + encodeURIComponent(updateError.message));
  }

  const { data: preds } = await admin
    .from('predictions')
    .select('id, user_id, pred_home_score, pred_away_score')
    .eq('match_id', match.id);

  if (!preds || preds.length === 0) {
    revalidatePath('/dashboard');
    return;
  }

  for (const pred of preds) {
    const pts = calculatePoints(
      pred.pred_home_score,
      pred.pred_away_score,
      homeScore,
      awayScore
    );

    await admin.from('predictions').update({ points_awarded: pts }).eq('id', pred.id);

    if (pts > 0) {
      await admin.rpc('increment_points', { uid: pred.user_id, pts });
    }
  }

  revalidatePath('/dashboard');
}

export async function resetTournament() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/auth/login?next=/dashboard');

  const admin = createAdminClient();

  await admin
    .from('matches')
    .update({ home_score: null, away_score: null, status: 'scheduled' })
    .neq('status', 'scheduled');

  await admin.from('predictions').update({ points_awarded: 0 }).gte('points_awarded', 0);

  await admin.from('profiles').update({ total_points: 0 }).gte('total_points', 0);

  revalidatePath('/dashboard');
}
