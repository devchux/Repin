import { DashboardHeader } from "@/components/dashboard/layout/header";
import { DashboardSidebar } from "@/components/dashboard/layout/sidebar";

export default function Home() {
  return (
    <div className="flex h-dvh bg-muted/20">
      <DashboardSidebar />
      <div className="min-w-0 flex-1">
        <DashboardHeader />
      </div>
    </div>
  );
}
