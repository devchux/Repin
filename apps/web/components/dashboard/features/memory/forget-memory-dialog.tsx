"use client";

import { useForgetMemory } from "@/hooks/useMemories";
import { Button } from "@repo/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@repo/ui/dialog";
import { LoaderCircle, Trash2 } from "@repo/ui/icons";

export function ForgetMemoryDialog({
  memoryId,
  open,
  onOpenChange,
}: {
  readonly memoryId: string;
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
}) {
  const forget = useForgetMemory(memoryId, () => onOpenChange(false));
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Forget this memory?</DialogTitle>
          <DialogDescription>
            Repin will stop using this information as remembered context. The
            original bookmark, note, or highlight will not be deleted.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={forget.isPending}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={forget.isPending}
            onClick={() => forget.mutate()}
          >
            {forget.isPending ? (
              <LoaderCircle className="animate-spin" />
            ) : (
              <Trash2 />
            )}
            {forget.isPending ? "Forgetting…" : "Forget memory"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
