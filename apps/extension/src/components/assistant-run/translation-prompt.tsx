import { Button } from "@repo/ui/button";

import { TARGET_LANGUAGES } from "@/lib/constants";

type TranslationPromptProps = {
  readonly targetLanguage: string;
  readonly onTargetLanguageChange: (language: string) => void;
  readonly onSubmit: () => void;
};

export const TranslationPrompt = ({
  targetLanguage,
  onTargetLanguageChange,
  onSubmit,
}: TranslationPromptProps) => (
  <section className="flex flex-1 flex-col gap-4 p-4">
    <div>
      <label
        className="text-sm font-medium text-neutral-800 dark:text-neutral-100"
        htmlFor="repin-target-language"
      >
        Translate to
      </label>
      <select
        className="mt-2 h-10 w-full rounded-md border border-neutral-200 bg-white px-3 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-primary dark:border-neutral-800 dark:bg-neutral-900"
        id="repin-target-language"
        value={targetLanguage}
        onChange={(event) => onTargetLanguageChange(event.target.value)}
      >
        <option value="">Choose a language</option>
        {TARGET_LANGUAGES.map((language) => (
          <option key={language} value={language}>
            {language}
          </option>
        ))}
      </select>
    </div>
    <Button className="self-end" disabled={!targetLanguage} onClick={onSubmit}>
      Translate
    </Button>
  </section>
);
