import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-green-950 to-zinc-950 px-4 text-white">
      <main className="flex w-full max-w-2xl flex-col items-center gap-8 text-center">
        {/* Official logo */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://upload.wikimedia.org/wikipedia/en/thumb/1/17/2026_FIFA_World_Cup_emblem.svg/250px-2026_FIFA_World_Cup_emblem.svg.png"
          alt="2026 FIFA World Cup"
          width={120}
          height={120}
          className="drop-shadow-xl"
        />

        {/* Headline */}
        <h1 className="text-5xl font-bold tracking-tight sm:text-6xl">
          Andy's Amazing World Cup Predictor!
        </h1>
        <p className="max-w-md text-lg text-zinc-300">
          Pick scores for every group-stage match, earn points for correct results,
          and battle your friends on the global leaderboard.
        </p>

        {/* How it works */}
        <div className="grid w-full grid-cols-3 gap-4 text-sm">
          {[
            { icon: '🎯', title: 'Predict', desc: 'Enter scores for all 72 group fixtures' },
            { icon: '🎲', title: 'Simulate', desc: 'Watch results roll in match by match' },
            { icon: '🏆', title: 'Compete', desc: '3 pts exact • 1 pt correct outcome' },
          ].map(({ icon, title, desc }) => (
            <div key={title} className="rounded-xl bg-white/5 p-4">
              <div className="text-2xl">{icon}</div>
              <div className="mt-2 font-semibold text-white">{title}</div>
              <div className="mt-1 text-zinc-400">{desc}</div>
            </div>
          ))}
        </div>

        {/* CTA */}
        {user ? (
          <div className="flex flex-col items-center gap-2">
            <Link
              href="/dashboard"
              className="rounded-xl bg-green-600 px-8 py-3 text-base font-semibold text-white shadow-lg transition hover:bg-green-700"
            >
              Go to Dashboard
            </Link>
            <span className="text-sm text-zinc-400">Signed in as {user.email}</span>
          </div>
        ) : (
          <div className="flex gap-3">
            <Link
              href="/auth/signup"
              className="rounded-xl bg-green-600 px-8 py-3 text-base font-semibold text-white shadow-lg transition hover:bg-green-700"
            >
              Sign up free
            </Link>
            <Link
              href="/auth/login"
              className="rounded-xl border border-zinc-600 px-8 py-3 text-base font-semibold text-zinc-200 transition hover:border-zinc-400 hover:text-white"
            >
              Log in
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
