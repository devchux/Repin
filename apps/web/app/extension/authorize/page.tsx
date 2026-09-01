import type { Metadata } from "next";

import { ExtensionAuthorization } from "@/components/auth/extension-authorization";

export const metadata: Metadata = {
  title: "Connect browser extension | Repin",
  description: "Connect this browser to your Repin workspace.",
};

export default function ExtensionAuthorizePage() {
  return <ExtensionAuthorization />;
}
