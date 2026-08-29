import { z } from "zod";

export const workflowSelectionDecisionSchema = z
  .object({
    workflowDefinitionId: z.string().nullable(),
    confidence: z.number().min(0).max(1),
    requiresMultipleSteps: z.boolean(),
    reason: z.string().min(1).max(2_000),
  })
  .strict();

export type WorkflowSelectionDecision = z.infer<
  typeof workflowSelectionDecisionSchema
>;

export const workflowSelectionDecisionJsonSchema = z.toJSONSchema(
  workflowSelectionDecisionSchema,
);

export const workflowGenerationDecisionSchema = z
  .object({
    requiresWorkflow: z.boolean(),
    reason: z.string().min(1).max(2_000),
    name: z.string().trim().min(1).max(200),
    description: z.string().trim().min(1).max(2_000),
    successCriteria: z.array(z.string().trim().min(1).max(1_000)).min(1).max(7),
    stages: z
      .array(
        z.object({ instruction: z.string().trim().min(1).max(2_000) }).strict(),
      )
      .max(8),
  })
  .strict();

export type WorkflowGenerationDecision = z.infer<
  typeof workflowGenerationDecisionSchema
>;

export const workflowGenerationDecisionJsonSchema = z.toJSONSchema(
  workflowGenerationDecisionSchema,
);
