import { BookmarkDetail } from "@/components/dashboard/pages/library-detail";
import { bookmarks } from "@/lib/library-data";
import { notFound } from "next/navigation";
export default async function Page({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; const item = bookmarks.find((entry) => entry.id === id); if (!item) notFound(); return <BookmarkDetail item={item} />; }
