"use client";

import { ArrowLeft, ExternalLink, Newspaper } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { SportsNewsItem } from "@/lib/sports";

export function NewsDetailPage({ id }: { id: string }) {
  const [item, setItem] = useState<SportsNewsItem | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function loadNews() {
      setLoading(true);
      try {
        const response = await fetch("/api/sports/news", { cache: "no-store" });
        const data = (await response.json()) as { items: SportsNewsItem[] };
        if (!cancelled) {
          setItem(data.items.find((newsItem) => newsItem.id === decodeURIComponent(id)) ?? null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadNews();
    return () => {
      cancelled = true;
    };
  }, [id]);

  return (
    <main className="x-cup-bg min-h-[100dvh] overflow-x-clip text-white">
      <div className="mx-auto flex min-h-[100dvh] w-full max-w-4xl flex-col px-3 pb-8 pt-4 sm:px-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <Link className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.06] px-3 py-2 text-sm font-black text-white transition hover:bg-white/12" href="/">
            <ArrowLeft size={16} aria-hidden="true" />
            Back
          </Link>
          <span className="grid h-10 w-10 place-items-center rounded-lg border border-[#18e3bd]/20 bg-[#18e3bd]/10 text-[#18e3bd]">
            <Newspaper size={19} aria-hidden="true" />
          </span>
        </div>

        {loading ? <div className="h-80 animate-pulse rounded-lg border border-white/10 bg-white/[0.045]" /> : null}

        {!loading && !item ? (
          <section className="rounded-lg border border-white/10 bg-white/[0.045] p-5">
            <p className="text-xl font-black text-white">News item unavailable</p>
            <p className="mt-2 text-sm leading-6 text-white/58">The live feed may have rotated. Return to headlines for the latest stories.</p>
          </section>
        ) : null}

        {item ? (
          <article className="overflow-hidden rounded-lg border border-white/10 bg-white/[0.045]">
            {item.image ? <img className="h-52 w-full object-cover sm:h-72" src={item.image} alt="" /> : null}
            <div className="p-4 sm:p-6">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#18e3bd]">{item.source}</p>
              <h1 className="mt-3 text-3xl font-black leading-tight text-white sm:text-5xl">{item.title}</h1>
              <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold text-white/46">
                {item.byline ? <span>{item.byline}</span> : null}
                {item.published ? <span>{new Date(item.published).toLocaleString()}</span> : null}
                {item.category ? <span>{item.category}</span> : null}
              </div>
              <div className="mt-5 grid gap-4 text-base leading-8 text-white/72">
                <p>{item.description || item.summary || "The live news provider did not include a detailed description for this headline."}</p>
                <p>
                  This story is tracked inside X Cup Arena so users can move from headlines into match context without leaving the app first. Use the source link for the original article and future updates.
                </p>
              </div>
              <a className="mt-6 inline-flex items-center gap-2 rounded-lg bg-white px-4 py-3 text-sm font-black text-black transition hover:bg-[#18e3bd]" href={item.link} target="_blank" rel="noreferrer">
                Open source
                <ExternalLink size={16} aria-hidden="true" />
              </a>
            </div>
          </article>
        ) : null}
      </div>
    </main>
  );
}
