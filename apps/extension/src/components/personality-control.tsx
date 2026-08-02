import { Check, ChevronDown, ChevronUp } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@repo/ui/popover";
import { PERSONALITIES, Personality } from "@/types/sidebar";

interface PersonalityControlProps {
  chevron: "up" | "down";
  personality: Personality;
  personalities: typeof PERSONALITIES;
  setPersonality: (personality: Personality) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
}

const PersonalityControl = ({
  chevron,
  personality,
  personalities,
  setPersonality,
  open,
  setOpen,
}: PersonalityControlProps) => {
  const Chevron = chevron === "up" ? ChevronUp : ChevronDown;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-neutral-100 px-3 text-sm font-medium transition hover:bg-neutral-200 dark:bg-neutral-950 dark:hover:bg-neutral-800"
          type="button"
        >
          {personality}
          <Chevron aria-hidden="true" className="size-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-56 rounded-3xl p-3"
        portalled={false}
        side="top"
        sideOffset={8}
      >
        <p className="mb-3 px-2 text-xs font-medium text-neutral-500 dark:text-neutral-400">
          Personality
        </p>
        <div className="space-y-1">
          {personalities.map((option) => (
            <button
              className="flex h-8 w-full items-center justify-between rounded-md px-2 text-left text-sm transition hover:bg-neutral-100 dark:hover:bg-neutral-800"
              key={option}
              type="button"
              onClick={() => {
                setPersonality(option);
                setOpen(false);
              }}
            >
              <span>{option}</span>
              {option === personality ? (
                <Check aria-hidden="true" className="size-4" />
              ) : null}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default PersonalityControl;
