import { NextResponse } from "next/server";
import type { SportsNewsItem, SportsNewsResponse } from "@/lib/sports";

export const dynamic = "force-dynamic";
export const revalidate = 180;

type EspnNews = {
  articles?: Array<{
    id?: number | string;
    headline?: string;
    description?: string;
    published?: string;
    links?: { web?: { href?: string } };
    images?: Array<{ url?: string }>;
    source?: string;
    byline?: string;
    type?: string;
  }>;
};

const newsFeeds = [
  "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/news",
  "https://site.api.espn.com/apis/site/v2/sports/soccer/news",
  "https://site.api.espn.com/apis/site/v2/sports/soccer/uefa.champions/news",
  "https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/news",
  "https://site.api.espn.com/apis/site/v2/sports/soccer/ned.1/news",
  "https://site.api.espn.com/apis/site/v2/sports/soccer/esp.1/news",
  "https://site.api.espn.com/apis/site/v2/sports/soccer/ita.1/news",
  "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/news",
  "https://site.api.espn.com/apis/site/v2/sports/cricket/news"
];
const NEWS_TIMEOUT_MS = 3500;

const footballTerms = [
  "world cup",
  "fifa",
  "champions league",
  "premier league",
  "laliga",
  "serie a",
  "bundesliga",
  "football",
  "soccer"
];

const priorityStories: SportsNewsItem[] = [
  {
    id: "priority-2026-ucl-psg-arsenal",
    title: "PSG win the 2026 UEFA Champions League title against Arsenal",
    description: "Paris Saint-Germain's Champions League win over Arsenal is treated as a major football storyline, so related UCL updates stay near the top of the XCUP feed.",
    summary: "Major UCL title story prioritized for the arena headline feed.",
    link: "https://www.uefa.com/uefachampionsleague/",
    source: "XCUP priority desk",
    category: "uefa.champions",
    published: "2026-05-30T22:00:00.000Z"
  }
];

const majorStoryTerms = [
  "champions league",
  "ucl",
  "psg",
  "paris saint-germain",
  "arsenal",
  "final",
  "title",
  "trophy",
  "winner",
  "won",
  "player ratings",
  "postmatch",
  "reaction"
];

function storyScore(item: SportsNewsItem) {
  const text = `${item.title} ${item.description} ${item.category ?? ""}`.toLowerCase();
  const publishedAt = new Date(item.published ?? 0).getTime();
  const ageHours = publishedAt ? Math.max(0, (Date.now() - publishedAt) / 3_600_000) : 96;
  const recency = Math.max(0, 80 - ageHours);
  const major = majorStoryTerms.reduce((score, term) => score + (text.includes(term) ? 16 : 0), 0);
  const football = footballTerms.some((term) => text.includes(term)) ? 18 : 0;
  const worldCup = text.includes("world cup") || text.includes("fifa") ? 24 : 0;
  return recency + major + football + worldCup;
}

async function fetchNewsPayload(url: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), NEWS_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      next: { revalidate: 180 },
      signal: controller.signal
    });

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as EspnNews;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchNews(url: string) {
  const data = await fetchNewsPayload(url);
  if (!data) {
    return [];
  }

  return (data.articles ?? []).map<SportsNewsItem>((article, index) => ({
    id: String(article.id ?? `${url}-${index}`),
    title: article.headline ?? "Sports headline",
    description: article.description ?? "",
    summary: article.description ?? "",
    link: article.links?.web?.href ?? "https://www.espn.com/soccer/",
    image: article.images?.[0]?.url,
    source: article.source ?? "ESPN",
    byline: article.byline,
    category: article.type,
    published: article.published
  }));
}

export async function GET() {
  const settled = await Promise.allSettled(newsFeeds.map(fetchNews));
  const seen = new Set<string>();
  const items = [...priorityStories, ...settled
    .flatMap((result) => (result.status === "fulfilled" ? result.value : []))
    .sort((a, b) => {
      const scoreDelta = storyScore(b) - storyScore(a);
      if (scoreDelta) return scoreDelta;
      return new Date(b.published ?? 0).getTime() - new Date(a.published ?? 0).getTime();
    })]
    .sort((a, b) => {
      const scoreDelta = storyScore(b) - storyScore(a);
      if (scoreDelta) return scoreDelta;
      return new Date(b.published ?? 0).getTime() - new Date(a.published ?? 0).getTime();
    })
    .filter((item) => {
      const key = item.title.toLowerCase();
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    })
    .slice(0, 18);

  const body: SportsNewsResponse = {
    generatedAt: new Date().toISOString(),
    items
  };

  return NextResponse.json(body);
}
