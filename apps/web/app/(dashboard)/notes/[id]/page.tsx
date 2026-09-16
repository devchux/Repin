import { NoteDetail } from "@/components/dashboard/pages/library-detail";
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <NoteDetail noteId={id} />;
}
