# Product Requirement Document (PRD)

## Project Name: World Cup Predictor MVP (Hackathon Edition)

### 1. Overview & Objectives

This document provides a comprehensive blueprint for building a multi-user, interactive World Cup prediction application optimized for a fast-paced 2-hour hackathon environment. The core goal is to deliver an engaging, gamified user experience that allows users to predict tournament fixtures group-by-group, track their accuracy against simulated match results in real-time, and compete on a global leaderboard.

### 2. Tech Stack & Infrastructure

- **Frontend Framework:** Next.js (App Router, React)
- **Styling & UI Components:** Tailwind CSS & shadcn/ui (for rapid, clean, responsive UI building)
- **Backend & Database:** Supabase (PostgreSQL database, Row Level Security, Realtime tables, and Supabase Auth)
- **Hosting Platform:** Vercel

---

## 3. Database Schema (Supabase SQL)

Execute the following DDL script inside your Supabase SQL Editor to provision the required tables, keys, and Row Level Security (RLS) rules instantaneously:

```sql
-- Reset environment if needed (Caution in production, ideal for hackathon iterations)
drop table if exists public.predictions cascade;
drop table if exists public.matches cascade;
drop table if exists public.teams cascade;
drop table if exists public.profiles cascade;

-- 1. Profiles Table (Linked to Supabase Auth Users)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  username text unique not null,
  total_points integer default 0,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Teams Lookup Table (With Relative Strengths for Simulation Engine)
create table public.teams (
  id text primary key,          -- e.g., 'ARG', 'BRA', 'MEX', 'RSA'
  name text not null,
  group_letter text not null,   -- 'A', 'B', 'C', etc.
  strength integer not null     -- Weight scale 1-100 (e.g., France: 94, Saudi Arabia: 62)
);

-- 3. Matches Table (Seeded Tournament Fixtures)
create table public.matches (
  id text primary key,          -- e.g., 'm1', 'm2', 'm3'
  home_team_id text references public.teams(id) on delete cascade not null,
  away_team_id text references public.teams(id) on delete cascade not null,
  group_letter text not null,
  home_score integer default null,
  away_score integer default null,
  status text default 'scheduled', -- 'scheduled', 'completed'
  match_order integer not null     -- Standard sequence identifier inside a specific group (1 to 6)
);

-- 4. Predictions Table (Tracks User Guesses)
create table public.predictions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  match_id text references public.matches(id) on delete cascade not null,
  pred_home_score integer not null,
  pred_away_score integer not null,
  points_awarded integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, match_id)
);

-- Enable Row Level Security (RLS)
alter table public.profiles enable row level security;
alter table public.teams enable row level security;
alter table public.matches enable row level security;
alter table public.predictions enable row level security;

-- Permissive Policies for Speed & Simple Hackathon Demo Flow
create policy "Allow all public read profiles" on public.profiles for select using (true);
create policy "Allow auth users to update own profile" on public.profiles for all using (auth.uid() = id);

create policy "Allow all public read teams" on public.teams for select using (true);
create policy "Allow all public read matches" on public.matches for select using (true);

create policy "Allow all public read predictions" on public.predictions for select using (true);
create policy "Allow auth users to upsert own predictions" on public.predictions for all using (auth.uid() = user_id);
```

---

## 4. Core Mathematical Logic & Score Matrix

### 4.1. Live Dynamic Win Probability

Instead of static betting odds, match cards calculate and present dynamic probabilities based directly on the relative team strengths defined in the database seed:

$$\text{Probability}_{\text{Home Win}} = \frac{\text{Strength}_{\text{Home}}}{\text{Strength}_{\text{Home}} + \text{Strength}_{\text{Away}}}$$

$$\text{Probability}_{\text{Away Win}} = \frac{\text{Strength}_{\text{Away}}}{\text{Strength}_{\text{Home}} + \text{Strength}_{\text{Away}}}$$

### 4.2. Gamified Scoring Rules

When a match status shifts from `'scheduled'` to `'completed'`, a computing function evaluates user rows inside the `predictions` table against the final result using these deterministic assignment constraints:

- **3 Points (Exact Match):** Chose exact outcomes and exact score (e.g., prediction: `2-1`, result: `2-1`).
- **1 Point (Correct Outcome):** Correctly designated the match outcome (Home Win, Away Win, or Draw), but guessed the incorrect specific score architecture (e.g., prediction: `3-0`, result: `1-0`).
- **0 Points (Incorrect):** Selected the wrong match outcome entirely.

---

## 5. UI/UX Layout Layout & Component Specification

The front-end design is a Single Page Application architecture featuring a Header layout containing **Auth State Actions** (Sign-in/Sign-up/Sign-out triggers) and a layout switcher matching three central tabs:

### Tab 1: Predictions (The Core Game Board)

- Shows a responsive viewport grid layout of World Cup Group brackets (Group A, Group B, Group C, etc.).
- Group panels indicate user status badges (e.g., `Status: Unpredicted` vs `Status: Completed 6/6`).
- **The 1-by-1 Sequential Prediction Modal:**
  - Triggered by interacting with any Group panel card.
  - Isolation layout focusing on exactly **one match at a time** (e.g., _Match 2 of 6: Mexico vs. South Africa_).
  - Showcases national names, stylized score inputs (`min="0" max="20"`), and clear win probability stats derived from the team metrics.
  - Interacting with the **"Next Match"** action shifts the layout index state forward. On the final 6th match, the action text shifts dynamically to **"Submit Group Bracket"**, batch-uploading the complete collection parameters directly to Supabase via an upsert command and safely closing the modal screen viewport.

### Tab 2: Results Engine View

- Displays a clear chronological timeline feed mapping all resolved fixtures (`status = 'completed'`).
- Each card template compares reality against user choice side-by-side: `Actual: Home X - Y Away` vs `Your Guess: Home A - B Away`.
- Features visually distinct color-coded badge indicators to signal performance at a glance:
  - **Emerald Badge ($+3$ Points):** Exact Score Match
  - **Amber Badge ($+1$ Point):** Correct Outcome
  - **Crimson Badge ($0$ Points):** Missed Evaluation

### Tab 3: Leaderboard Arena

- A clean real-time table layout rendering global standings across columns: `Rank | Competitor | Total Points Accumulated`.
- Fetches parameters sequentially from the `profiles` data path sorted descending by `total_points`.

### Admin Trigger Matrix (Simulation Utility)

- A specialized control layout box or floating operational interface node accessible during presentation stages titled **"Simulate Next Fixture"**.
- Execution actions complete the following steps cleanly:
  1. Identifies the earliest sequential row in `matches` where `status = 'scheduled'`.
  2. Runs a quick randomized score generation script weighted heavily toward the opponent possessing the higher relative database `strength` factor.
  3. Updates the targeted `matches` table target fields setting final score integers and converting the active status state to `'completed'`.
  4. Scans matching rows in the `predictions` collection to calculate point metrics.
  5. Runs an operational increment routine updating the `total_points` variable fields inside matching `profiles`.
  6. Sends a refresh pipeline update message updating global active layout instances.

---

## 6. Implementation Playbook for Claude Code

Execute the following tasks sequentially to construct the functional MVP cleanly:

```markdown
### TASK 1: Base Configuration & Seed Scripts

1. Setup standard project environment bindings mapping private Supabase connection strings safely.
2. Formulate a database seeder routine inside `/utils/seed-tournament.ts` establishing lookup indices for Group A and Group B competitors using detailed relative values (e.g., France: 92, Italy: 88, USA: 81, South Africa: 68). Instruct the routine to initialize the standard 6 fixture combinations mapping each specific group category.

### TASK 2: Authentication Handshake Flow

1. Design minimal, intuitive input modules managing account signups and active user login routines using Supabase Auth mechanisms.
2. Establish a background trigger or UI logic layer ensuring that successful new auth accounts generate a matching row in public.profiles with an editable screen name value.

### TASK 3: Interactive Modal Prediction Engine

1. Lay out the principal dashboard framework hosting the core tab selection widgets.
2. Build out the localized state-management system powering the single-game step modal layout. Cache user choices locally inside component memory spaces until the final group submission payload triggers.

### TASK 4: Result Evaluator & Simulation Controls

1. Code the administrative simulation math routine. Generate realistic final outcomes using randomized scoring ranges bounded by the team weight variables.
2. Author the backend matching query processing incoming results against active prediction data arrays, incrementing individual points tracking scores, and updating user high-score properties.

### TASK 5: Leaderboard Matrix & Final Views

1. Build out the high-score spreadsheet grid binding live parameters directly from the user data views.
2. Wire up Tab 2 to map prediction metrics directly beside the completed outcome objects.
```
