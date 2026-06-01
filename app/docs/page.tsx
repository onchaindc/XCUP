import Link from "next/link";
import { ArrowRight, BookOpen, Bot, Gamepad2, ShieldCheck, Trophy, Users, Wallet } from "lucide-react";
import { XLayerMark } from "@/components/XCupApp";

const sections = [
  {
    title: "Getting started",
    icon: Trophy,
    items: [
      "Use the home arena to follow live matches, headlines, and prediction entry points.",
      "Connect a wallet only when you want onchain proofs, joins, or payments.",
      "Settings control profile privacy, notifications, approvals, sessions, motion, and matchday music."
    ]
  },
  {
    title: "Squads",
    icon: Users,
    items: [
      "Create a squad with a name, role, territory, motto, and accent.",
      "Join squads from the live roster board and open the squad arena for chat, GIFs, reactions, tips, votes, and competitions.",
      "Saved squads are cached locally so a temporary sync miss does not make your room feel deleted."
    ]
  },
  {
    title: "Markets and matches",
    icon: ShieldCheck,
    items: [
      "Live match details show goals, penalties, substitutions, stats, lineups, substitutes, and managers when the feed provides them.",
      "Prediction actions should be confirmed only after checking score state, clock state, liquidity, and wallet approval details.",
      "Market and match views are built for verified sports data first; missing feed fields are shown conservatively."
    ]
  },
  {
    title: "GameFi and agent",
    icon: Gamepad2,
    items: [
      "GameFi modules include squad competitions, player stock loops, penalty duels, and Starting XI battles.",
      "The AI agent summarizes match context and tactical signals. Treat it as support, not settlement authority.",
      "Captain voting and squad activities affect reputation-style surfaces inside the squad room."
    ]
  },
  {
    title: "Wallet safety",
    icon: Wallet,
    items: [
      "Wallet approvals can require explicit confirmation in Settings.",
      "Approval limits are checked before payment confirmation surfaces.",
      "Active sessions can be cleared from Settings on this device."
    ]
  }
];

export default function DocsPage() {
  return (
    <main className="x-cup-bg min-h-[100dvh] overflow-x-clip text-white">
      <div className="mx-auto flex min-h-[100dvh] w-full max-w-[92rem] flex-col px-4 pb-8 pt-4 sm:px-6 lg:px-8">
        <header className="mb-4 flex items-center justify-between gap-3 border-b border-white/10 bg-[#030409]/90 py-3 backdrop-blur-xl">
          <Link className="flex min-w-0 items-center gap-3" href="/">
            <XLayerMark className="h-9 w-9 shrink-0" />
            <span className="min-w-0">
              <span className="block truncate text-base font-black text-white">X Cup Arena</span>
              <span className="block truncate text-[11px] font-bold uppercase tracking-[0.22em] text-white/42">Docs</span>
            </span>
          </Link>
          <a className="grid h-10 w-10 place-items-center rounded-lg border border-white/10 bg-white/[0.04] text-sm font-black text-white/70 transition hover:bg-white/10 hover:text-white" href="https://x.com/xcuparena" target="_blank" rel="noreferrer" aria-label="X">
            X
          </a>
        </header>

        <section className="relative overflow-hidden rounded-lg border border-white/10 bg-black p-4 sm:p-6">
          <div className="absolute inset-0 opacity-70">
            <div className="x-reference-grid" />
          </div>
          <div className="relative z-10 max-w-4xl">
            <p className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.18em] text-[#18e3bd]">
              <BookOpen size={15} aria-hidden="true" />
              Documentation
            </p>
            <h1 className="mt-3 text-3xl font-black leading-tight text-white sm:text-5xl">How XCUP Arena works</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/62">
              A compact guide to the match arena, squads, GameFi modules, AI support, wallet safety, and user settings.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-black text-black transition hover:bg-[#18e3bd]" href="/squads">
                Open Squads
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
              <Link className="flex items-center gap-2 rounded-lg border border-white/12 bg-white/[0.06] px-3 py-2 text-sm font-black text-white transition hover:bg-white/12" href="/settings">
                Settings
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
            </div>
          </div>
        </section>

        <section className="mt-4 grid gap-4 lg:grid-cols-2">
          {sections.map((section) => (
            <article key={section.title} className="rounded-lg border border-white/10 bg-white/[0.045] p-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-xl font-black text-white">{section.title}</h2>
                <section.icon size={18} className="text-[#18e3bd]" aria-hidden="true" />
              </div>
              <div className="mt-4 grid gap-2">
                {section.items.map((item) => (
                  <p key={item} className="rounded-lg border border-white/10 bg-black/35 p-3 text-sm leading-6 text-white/64">{item}</p>
                ))}
              </div>
            </article>
          ))}
          <article className="rounded-lg border border-white/10 bg-white/[0.045] p-4 lg:col-span-2">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#18e3bd]">Community</p>
                <h2 className="mt-1 text-xl font-black text-white">Follow updates</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                <a className="rounded-lg border border-white/10 bg-white/[0.06] px-4 py-3 text-sm font-black text-white transition hover:bg-white/12" href="https://x.com/xcuparena" target="_blank" rel="noreferrer">X</a>
                <Link className="rounded-lg border border-white/10 bg-white/[0.06] px-4 py-3 text-sm font-black text-white transition hover:bg-white/12" href="/">Arena</Link>
              </div>
            </div>
          </article>
        </section>
      </div>
    </main>
  );
}
