import { BookmarkDetail } from "@/components/dashboard/pages/library-detail";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <BookmarkDetail bookmarkId={id} />;
}
