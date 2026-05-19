-- Atomic increment of total_points for a given user.
-- Used by the simulation server action to avoid read-modify-write races.
create or replace function public.increment_points(uid uuid, pts integer)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.profiles
  set total_points = total_points + pts
  where id = uid;
$$;
