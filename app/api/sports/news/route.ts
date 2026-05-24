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
  const items = settled
    .flatMap((result) => (result.status === "fulfilled" ? result.value : []))
    .sort((a, b) => {
      const aText = `${a.title} ${a.description}`.toLowerCase();
      const bText = `${b.title} ${b.description}`.toLowerCase();
      const aWorldCup = aText.includes("world cup") || aText.includes("fifa");
      const bWorldCup = bText.includes("world cup") || bText.includes("fifa");
      if (aWorldCup !== bWorldCup) {
        return aWorldCup ? -1 : 1;
      }
      const aFootball = footballTerms.some((term) => aText.includes(term));
      const bFootball = footballTerms.some((term) => bText.includes(term));
      if (aFootball !== bFootball) {
        return aFootball ? -1 : 1;
      }
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
