import { LiveMatchPage } from "@/components/LiveMatchPage";

export default async function MatchPage({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const { id = "" } = await searchParams;
  return <LiveMatchPage id={id} />;
}
