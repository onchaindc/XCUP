import { ProfilePage } from "@/components/ProfilePage";

export const dynamic = "force-dynamic";

export default async function Profile({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams;
  const initialTab = tab === "settings" ? "settings" : "overview";
  return <ProfilePage initialTab={initialTab} />;
}
