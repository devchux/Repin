import { DashboardHeader } from "@/components/dashboard/layout/header";
import { DashboardSidebar } from "@/components/dashboard/layout/sidebar";
import React from "react";

const DashboardLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="flex h-dvh bg-muted/20 overflow-hidden">
      <DashboardSidebar />
      <div className="min-w-0 flex-1 h-full overflow-auto">
        <DashboardHeader />
        {children}
      </div>
    </div>
  );
};

export default DashboardLayout;
