import { NoteDetail } from "@/components/dashboard/pages/library-detail";
import { notes } from "@/lib/library-data";
import { notFound } from "next/navigation";
export default async function Page({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; const item = notes.find((entry) => entry.id === id); if (!item) notFound(); return <NoteDetail item={item} />; }
