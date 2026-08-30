import { HighlightDetail } from "@/components/dashboard/pages/library-detail";
import { highlights } from "@/lib/library-data";
import { notFound } from "next/navigation";
export default async function Page({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; const item = highlights.find((entry) => entry.id === id); if (!item) notFound(); return <HighlightDetail item={item} />; }
