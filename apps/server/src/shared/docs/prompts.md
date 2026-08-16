# Shared AI Prompts

All production model prompts are constructed in `src/shared/ai/prompts.ts`.
Resource services supply typed inputs and consume provider results; they should
not embed system or user prompt templates directly.

Each prompt family has an explicit identifier in `PROMPT_VERSIONS`:

- `assistant.v1`
- `conversation.v1`
- `workflow-selection.v1`
- `workflow-generation.v1`

Prompt builders preserve trust boundaries by placing webpage content, user
requests, and workflow candidates in user messages while system messages define
behavior and safety constraints. New model-backed capabilities should add a
typed builder and version in this shared file, with focused tests for message
roles, untrusted-data boundaries, and structured content.
