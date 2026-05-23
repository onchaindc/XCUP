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
  }>;
};

const newsFeeds = [
  "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/news",
  "https://site.api.espn.com/apis/site/v2/sports/soccer/news",
  "https://site.api.espn.com/apis/site/v2/sports/soccer/uefa.champions/news",
  "https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/news",
  "https://site.api.espn.com/apis/site/v2/sports/soccer/esp.1/news",
  "https://site.api.espn.com/apis/site/v2/sports/soccer/ita.1/news",
  "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/news",
  "https://site.api.espn.com/apis/site/v2/sports/cricket/news"
];

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

async function fetchNews(url: string) {
  const response = await fetch(url, { next: { revalidate: 180 } });
  if (!response.ok) {
    return [];
  }
  const data = (await response.json()) as EspnNews;
  return (data.articles ?? []).map<SportsNewsItem>((article, index) => ({
    id: String(article.id ?? `${url}-${index}`),
    title: article.headline ?? "Sports headline",
    description: article.description ?? "",
    link: article.links?.web?.href ?? "https://www.espn.com/soccer/",
    image: article.images?.[0]?.url,
    source: article.source ?? "ESPN",
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
