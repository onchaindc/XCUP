"use client";

import { ArrowLeft, BarChart3, Radio, Shirt, Trophy } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { LiveMatchDetails, LiveMatchTeamLineup } from "@/lib/sports";
import { formatLiveEventMatchup } from "@/lib/sports";

export function LiveMatchPage({ id }: { id: string }) {
  const [details, setDetails] = useState<LiveMatchDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function loadDetails() {
      setLoading((current) => current && !details);
      try {
        const response = await fetch(`/api/sports/live/details?id=${encodeURIComponent(id)}`, { cache: "no-store" });
        const data = (await response.json()) as LiveMatchDetails & { error?: string };
        if (!response.ok) {
          throw new Error(data.message || data.error || "Live match details are unavailable.");
        }
        if (!cancelled) {
          setDetails(data);
          setError("");
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Live match details are unavailable.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadDetails();
    const interval = window.setInterval(() => void loadDetails(), 20_000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [details, id]);

  const event = details?.event;
  return (
    <main className="x-cup-bg min-h-[100dvh] overflow-x-clip text-white">
      <div className="mx-auto flex min-h-[100dvh] w-full max-w-[92rem] flex-col px-4 pb-8 pt-4 sm:px-6 lg:px-8">
        <Link className="mb-4 inline-flex w-fit items-center gap-2 rounded-lg border border-white/10 bg-white/[0.05] px-3 py-2 text-sm font-black text-white transition hover:bg-white/10" href="/markets">
          <ArrowLeft size={16} aria-hidden="true" />
          Markets
        </Link>

        {loading ? <div className="h-80 animate-pulse rounded-lg border border-white/10 bg-white/[0.045]" /> : null}
        {!loading && error ? <p className="rounded-lg border border-[#ff5c39]/25 bg-[#ff5c39]/10 p-4 text-sm font-bold text-[#ffb09d]">{error}</p> : null}

        {event && details?.available ? (
          <>
            <section className="rounded-lg border border-white/10 bg-black p-4 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.18em] text-[#18e3bd]">
                    <Radio size={14} aria-hidden="true" />
                    Live match center
                  </p>
                  <h1 className="mt-3 text-3xl font-black text-white sm:text-5xl">{formatLiveEventMatchup(event)}</h1>
                  <p className="mt-3 text-sm leading-6 text-white/60">{event.league} - {event.status.detail}{event.status.clock ? ` - ${event.status.clock}` : ""}</p>
                </div>
                <div className="grid min-w-64 grid-cols-2 gap-2">
                  <ScoreBlock label="Away" name={event.awayTeam.shortName} score={event.awayTeam.score} logo={event.awayTeam.logo} />
                  <ScoreBlock label="Home" name={event.homeTeam.shortName} score={event.homeTeam.score} logo={event.homeTeam.logo} />
                </div>
              </div>
              <p className="mt-4 text-xs font-bold text-white/42">Source: {details.source}. Refreshes every 20 seconds while open.</p>
            </section>

            <section className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_24rem]">
              <div className="grid gap-4">
                <section className="rounded-lg border border-white/10 bg-white/[0.045] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#18e3bd]">Full stats</p>
                      <h2 className="mt-1 text-2xl font-black text-white">Live team stats</h2>
                    </div>
                    <BarChart3 size={18} className="text-[#18e3bd]" aria-hidden="true" />
                  </div>
                  <div className="mt-4 grid gap-2 md:grid-cols-2">
                    {details.stats.map((stat) => <StatRow key={stat.label} label={stat.label} away={stat.away} home={stat.home} />)}
                    {!details.stats.length ? <p className="rounded-lg border border-white/10 bg-black/35 p-4 text-sm text-white/60">The source has not published live stat rows for this match yet.</p> : null}
                  </div>
                  <div className="mt-4 rounded-lg border border-white/10 bg-black/25 p-3">
                    <p className="text-[11px] font-black uppercase tracking-[0.18em] text-white/42">Substitutions</p>
                    <div className="mt-3 grid gap-2 md:grid-cols-2">
                      {details.substitutions.slice(0, 10).map((substitution) => (
                        <div key={substitution.id} className="rounded-lg border border-white/10 bg-black/35 p-2 text-sm">
                          <p className="font-black text-white">{substitution.team ?? "Team"} {substitution.minute ? `- ${substitution.minute}` : ""}</p>
                          <p className="mt-1 text-xs leading-5 text-white/58">
                            {substitution.playerIn && substitution.playerOut ? `${substitution.playerIn} for ${substitution.playerOut}` : substitution.text}
                          </p>
                        </div>
                      ))}
                      {!details.substitutions.length ? <p className="text-sm text-white/58">No substitutions published yet.</p> : null}
                    </div>
                  </div>
                </section>

                <section className="rounded-lg border border-white/10 bg-white/[0.045] p-4">
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#18e3bd]">Goals</p>
                  <div className="mt-4 grid gap-2">
                    {details.goals.map((goal) => (
                      <div key={goal.id} className="rounded-lg border border-white/10 bg-black/35 p-3">
                        <p className="font-black text-white">{goal.athlete ?? "Scoring play"} {goal.team ? `- ${goal.team}` : ""} {goal.minute ? `- ${goal.minute}` : ""}</p>
                        <p className="mt-1 text-sm leading-6 text-white/58">
                          {goal.penalty ? "Penalty goal" : "Open-play goal"}{goal.score ? ` (${goal.score})` : ""}
                        </p>
                        <p className="mt-1 text-sm leading-6 text-white/58">Assist: {goal.assist ?? "No assist recorded"}</p>
                        <p className="mt-1 text-xs leading-5 text-white/42">{goal.text}</p>
                      </div>
                    ))}
                    {!details.goals.length ? <p className="rounded-lg border border-white/10 bg-black/35 p-4 text-sm text-white/60">No goals or scoring plays have been published yet.</p> : null}
                  </div>
                </section>
              </div>

              <aside className="grid content-start gap-4">
                {details.lineups.map((lineup) => <LineupPanel key={lineup.team} lineup={lineup} />)}
              </aside>
            </section>
          </>
        ) : null}
      </div>
    </main>
  );
}

function ScoreBlock({ label, name, score, logo }: { label: string; name: string; score?: string; logo?: string }) {
  const src = teamLogoSrc(name, logo);
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.045] p-3">
      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-white/38">{label}</p>
      <div className="mt-1 flex items-center gap-2">
        {src ? <img className="h-8 w-8 rounded-md object-contain" src={src} alt="" /> : null}
        <p className="truncate text-sm font-black text-white">{name}</p>
      </div>
      <p className="mt-2 text-3xl font-black text-[#18e3bd]">{score ?? "-"}</p>
    </div>
  );
}

function teamLogoSrc(name: string, logo?: string) {
  if (logo) return logo;
  const flags: Record<string, string> = {
    argentina: "ar",
    belgium: "be",
    brazil: "br",
    croatia: "hr",
    england: "gb-eng",
    france: "fr",
    germany: "de",
    ghana: "gh",
    italy: "it",
    mexico: "mx",
    morocco: "ma",
    netherlands: "nl",
    nigeria: "ng",
    portugal: "pt",
    senegal: "sn",
    spain: "es",
    "united states": "us",
    usa: "us"
  };
  const code = flags[name.toLowerCase()];
  return code ? `https://flagcdn.com/w80/${code}.png` : "";
}

function StatRow({ label, away, home }: { label: string; away: string; home: string }) {
  return (
    <div className="grid grid-cols-[4rem_1fr_4rem] items-center gap-3 rounded-lg border border-white/10 bg-black/35 p-3 text-sm">
      <p className="text-right font-black text-white">{away}</p>
      <p className="text-center font-bold text-white/58">{label}</p>
      <p className="font-black text-white">{home}</p>
    </div>
  );
}

function LineupPanel({ lineup }: { lineup: LiveMatchTeamLineup }) {
  return (
    <section className="rounded-lg border border-white/10 bg-white/[0.045] p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#18e3bd]">Starting XI</p>
          <h2 className="mt-1 text-xl font-black text-white">{lineup.team}</h2>
          {lineup.formation ? <p className="mt-1 text-xs font-bold text-white/42">Formation {lineup.formation}</p> : null}
        </div>
        <Shirt size={18} className="text-[#f5a524]" aria-hidden="true" />
      </div>
      <div className="mt-4 grid gap-2">
        {lineup.starters.map((player) => <PlayerRow key={player.id ?? player.name} player={player.name} meta={[player.jersey, player.position].filter(Boolean).join(" - ")} />)}
        {!lineup.starters.length ? <p className="rounded-lg border border-white/10 bg-black/35 p-3 text-sm text-white/58">Starting XI is not published by the source yet.</p> : null}
      </div>
      {lineup.substitutes.length ? (
        <div className="mt-4">
          <p className="mb-2 flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.18em] text-white/42">
            <Trophy size={13} aria-hidden="true" />
            Bench
          </p>
          <div className="grid gap-2">
            {lineup.substitutes.slice(0, 8).map((player) => <PlayerRow key={player.id ?? player.name} player={player.name} meta={[player.jersey, player.position].filter(Boolean).join(" - ")} />)}
          </div>
        </div>
      ) : null}
      <div className="mt-4 rounded-lg border border-white/10 bg-black/35 p-3">
        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-white/42">Coach / manager</p>
        <p className="mt-1 text-sm font-black text-white">{lineup.coach ?? "Not published by source"}</p>
      </div>
    </section>
  );
}

function PlayerRow({ player, meta }: { player: string; meta: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-black/35 px-3 py-2">
      <p className="truncate text-sm font-black text-white">{player}</p>
      {meta ? <p className="shrink-0 text-xs font-bold text-white/42">{meta}</p> : null}
    </div>
  );
}
