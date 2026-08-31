import { ActivityDetailPage } from "@/components/dashboard/pages/activity-detail";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ActivityDetailPage runId={id} />;
}
