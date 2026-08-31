import { ConversationChat } from "@/components/dashboard/pages/conversation-chat";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ConversationChat conversationId={id} />;
}
