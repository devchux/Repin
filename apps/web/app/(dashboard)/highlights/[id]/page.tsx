import { HighlightDetail } from "@/components/dashboard/features/highlights/highlight-detail";

export default async function Page({
  params,
}: {
  readonly params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <HighlightDetail highlightId={id} />;
}
