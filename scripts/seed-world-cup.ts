#!/usr/bin/env npx ts-node
/**
 * Seed script: fetches 2026 World Cup teams and group-stage matches from the
 * world-cup-api and inserts them into Supabase with strength ratings.
 *
 * Run once after applying the migration:
 *   npx ts-node scripts/seed-world-cup.ts
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// ---------------------------------------------------------------------------
// Load env
// ---------------------------------------------------------------------------
function loadEnv() {
  try {
    const content = readFileSync(resolve(process.cwd(), '.env.local'), 'utf8');
    const vars: Record<string, string> = {};
    for (const line of content.split('\n')) {
      const m = line.match(/^([^#=]+)=(.*)$/);
      if (m) vars[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
    }
    return vars;
  } catch {
    console.error('Could not read .env.local');
    process.exit(1);
  }
}

const env = loadEnv();
const supabaseUrl = env['NEXT_PUBLIC_SUPABASE_URL'];
const supabaseKey = env['SUPABASE_SECRET_KEY'];

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// ---------------------------------------------------------------------------
// Strength ratings by FIFA country code (1-100 scale, based on FIFA rankings)
// ---------------------------------------------------------------------------
const STRENGTH: Record<string, number> = {
  ARG: 95, FRA: 95, ENG: 91, ESP: 93, BRA: 93, POR: 92, GER: 92, BEL: 88,
  NED: 89, URU: 85, CRO: 86, SUI: 86, COL: 84, MAR: 83, NOR: 82, JPN: 82,
  MEX: 82, USA: 81, AUT: 81, TUR: 80, SWE: 80, SEN: 80, SCO: 79, CZE: 77,
  IRN: 76, PAR: 76, KOR: 75, ECU: 75, ALG: 78, CIV: 78, CAN: 78, EGY: 74,
  BIH: 74, RSA: 68, AUS: 73, GHA: 73, KSA: 70, COD: 70, QAT: 65, HAI: 60,
  IRQ: 65, NZL: 65, CUW: 62, CPV: 66, JOR: 68, PAN: 68, UZB: 65, PRK: 65,
};

const DEFAULT_STRENGTH = 72;

// ---------------------------------------------------------------------------
// API types
// ---------------------------------------------------------------------------
interface ApiTeam {
  id: number;
  name: string;
  code: string;
  flag_url: string | null;
  group_name: string;
}

interface ApiMatch {
  id: number;
  match_number: number;
  round: string;
  group_name: string | null;
  home_team_id: number;
  away_team_id: number;
  kickoff_utc: string | null;
  home_score: number | null;
  away_score: number | null;
  status: string;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  const API_BASE = 'https://world-cup-api.vercel.app/api';

  console.log('Fetching teams...');
  const teamsRes = await fetch(`${API_BASE}/teams`);
  if (!teamsRes.ok) throw new Error(`Teams API error: ${teamsRes.status}`);
  const teamsData: ApiTeam[] = await teamsRes.json();

  console.log(`Fetched ${teamsData.length} teams`);

  const teams = teamsData.map((t) => ({
    id: t.id,
    name: t.name,
    code: t.code,
    flag_url: t.flag_url,
    group_letter: t.group_name,
    strength: STRENGTH[t.code] ?? DEFAULT_STRENGTH,
  }));

  console.log('Upserting teams...');
  const { error: teamsError } = await supabase
    .from('teams')
    .upsert(teams, { onConflict: 'id' });

  if (teamsError) {
    console.error('Error upserting teams:', teamsError.message);
    process.exit(1);
  }
  console.log(`✓ ${teams.length} teams upserted`);

  console.log('Fetching matches...');
  const matchesRes = await fetch(`${API_BASE}/matches`);
  if (!matchesRes.ok) throw new Error(`Matches API error: ${matchesRes.status}`);
  const matchesData: ApiMatch[] = await matchesRes.json();

  const groupMatches = matchesData
    .filter((m) => m.round === 'group' && m.group_name)
    .map((m) => ({
      id: m.id,
      match_number: m.match_number,
      group_letter: m.group_name!,
      home_team_id: m.home_team_id,
      away_team_id: m.away_team_id,
      home_score: null,
      away_score: null,
      status: 'scheduled' as const,
      kickoff_utc: m.kickoff_utc,
    }));

  console.log(`Upserting ${groupMatches.length} group-stage matches...`);
  const { error: matchesError } = await supabase
    .from('matches')
    .upsert(groupMatches, { onConflict: 'id' });

  if (matchesError) {
    console.error('Error upserting matches:', matchesError.message);
    process.exit(1);
  }
  console.log(`✓ ${groupMatches.length} matches upserted`);
  console.log('Seed complete.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
