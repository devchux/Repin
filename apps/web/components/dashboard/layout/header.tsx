import { Button } from "@repo/ui/button";
import { Menu } from "@repo/ui/icons";
import { AccountMenu } from "./account-menu";
import { WorkspaceSearch } from "./workspace-search";

export function DashboardHeader({
  onOpenNavigation,
}: {
  readonly onOpenNavigation: () => void;
}) {
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b bg-background/90 px-4 backdrop-blur-xl md:px-6">
      <Button
        variant="ghost"
        size="icon"
        className="-ml-2 size-9 lg:hidden"
        aria-label="Open navigation"
        aria-controls="dashboard-navigation"
        onClick={onOpenNavigation}
      >
        <Menu aria-hidden="true" />
      </Button>
      <WorkspaceSearch />
      <div className="ml-auto flex items-center">
        <AccountMenu />
      </div>
    </header>
  );
}
