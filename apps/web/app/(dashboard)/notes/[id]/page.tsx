import { NoteEditor } from "@/components/dashboard/features/notes/note-editor";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <NoteEditor noteId={id} />;
}
