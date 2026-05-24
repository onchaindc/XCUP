import { NewsDetailPage } from "@/components/NewsDetailPage";

export default async function NewsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <NewsDetailPage id={id} />;
}
