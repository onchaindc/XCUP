import { SquadRoomPage } from "@/components/SquadRoomPage";

export const dynamic = "force-dynamic";

export default async function SquadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <SquadRoomPage id={id} />;
}
