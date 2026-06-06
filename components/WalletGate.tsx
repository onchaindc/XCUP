"use client";

import { ShieldCheck, Wallet } from "lucide-react";

export function WalletGate({
  title,
  description,
  busy,
  onConnect
}: {
  title: string;
  description: string;
  busy: boolean;
  onConnect: () => void;
}) {
  return (
    <section className="rounded-lg border border-white/10 bg-black p-6 sm:p-8">
      <div className="mx-auto flex max-w-2xl flex-col items-center text-center">
        <div className="grid h-16 w-16 place-items-center rounded-full border border-[#18e3bd]/25 bg-[#18e3bd]/10 text-[#18e3bd]">
          <ShieldCheck size={28} aria-hidden="true" />
        </div>
        <p className="mt-5 text-[11px] font-black uppercase tracking-[0.18em] text-[#18e3bd]">Wallet Required</p>
        <h1 className="mt-2 text-3xl font-black text-white sm:text-4xl">{title}</h1>
        <p className="mt-3 max-w-xl text-sm leading-6 text-white/62">{description}</p>
        <button className="mt-6 inline-flex items-center gap-2 rounded-lg bg-white px-4 py-3 text-sm font-black text-black transition hover:bg-[#18e3bd] disabled:cursor-not-allowed disabled:opacity-50" type="button" onClick={onConnect} disabled={busy}>
          <Wallet size={17} aria-hidden="true" />
          {busy ? "Connecting..." : "Connect wallet"}
        </button>
      </div>
    </section>
  );
}
