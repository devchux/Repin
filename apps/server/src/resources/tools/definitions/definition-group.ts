import type { AiTool } from '../../ai/types/provider';
import type { BrowserToolName } from '../types/browser-tool.types';

export type BrowserToolDefinition = AiTool & { readonly name: BrowserToolName };

export const selectDefinitions = (
  definitions: readonly BrowserToolDefinition[],
  names: readonly BrowserToolName[],
): readonly BrowserToolDefinition[] => {
  const byName = new Map(
    definitions.map((definition) => [definition.name, definition]),
  );
  return names.map((name) => {
    const definition = byName.get(name);
    if (!definition)
      throw new Error(`Missing browser tool definition: ${name}`);
    return definition;
  });
};
