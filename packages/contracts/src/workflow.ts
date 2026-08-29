import type {
  AiAssistantCapability,
  AssistantExecutionLane,
  AssistantRunOptions,
} from "./assistant";
import type { PageContext } from "./browser";
import { z } from "zod";

export const WORKFLOW_INSTANCE_STATUSES = [
  "queued",
  "running",
  "completed",
  "failed",
  "cancelled",
] as const;
export type WorkflowInstanceStatus =
  (typeof WORKFLOW_INSTANCE_STATUSES)[number];

export const WORKFLOW_NODE_STATUSES = [
  "pending",
  "running",
  "completed",
  "failed",
  "cancelled",
] as const;
export type WorkflowNodeStatus = (typeof WORKFLOW_NODE_STATUSES)[number];

export type WorkflowNode =
  | {
      readonly id: string;
      readonly type: "agent";
      readonly capability: AiAssistantCapability;
      readonly context: PageContext;
      readonly input?: string;
      readonly instruction?: string;
      readonly contextSource?: "definition" | "task";
      readonly inputSource?: "definition" | "task";
      readonly options?: AssistantRunOptions;
      readonly browserSessionId?: string;
      readonly browserExecutionTarget?: "extension" | "managed";
      readonly executionLane?: AssistantExecutionLane;
    }
  | {
      readonly id: string;
      readonly type: "condition";
      readonly inputKey: string;
      readonly operator: "exists" | "equals";
      readonly value?: unknown;
    }
  | { readonly id: string; readonly type: "end" };

export interface WorkflowEdge {
  readonly from: string;
  readonly to: string;
  readonly outcome?: "true" | "false";
}

export interface WorkflowGraph {
  readonly startNodeId: string;
  readonly nodes: readonly WorkflowNode[];
  readonly edges: readonly WorkflowEdge[];
}

export const workflowGoalSchema = z
  .object({
    objective: z.string().trim().min(1).max(2_000),
    successCriteria: z
      .array(
        z
          .object({
            id: z
              .string()
              .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
              .max(100),
            description: z.string().trim().min(1).max(1_000),
            verification: z.discriminatedUnion("type", [
              z.object({ type: z.literal("model") }).strict(),
              z
                .object({
                  type: z.literal("deterministic"),
                  source: z.enum(["input", "output"]),
                  path: z.string().trim().min(1).max(500),
                  operator: z.enum([
                    "exists",
                    "non_empty",
                    "equals",
                    "contains",
                  ]),
                  expected: z.unknown().optional(),
                })
                .strict(),
            ]),
          })
          .strict(),
      )
      .min(1)
      .max(8),
  })
  .strict()
  .superRefine((goal, context) => {
    const ids = new Set<string>();
    goal.successCriteria.forEach((criterion, index) => {
      if (ids.has(criterion.id)) {
        context.addIssue({
          code: "custom",
          path: ["successCriteria", index, "id"],
          message: "Success criterion IDs must be unique",
        });
      }
      ids.add(criterion.id);
      if (
        criterion.verification.type === "deterministic" &&
        ["equals", "contains"].includes(criterion.verification.operator) &&
        criterion.verification.expected === undefined
      ) {
        context.addIssue({
          code: "custom",
          path: ["successCriteria", index, "verification", "expected"],
          message: `${criterion.verification.operator} requires an expected value`,
        });
      }
    });
  });

export type WorkflowGoal = z.infer<typeof workflowGoalSchema>;

export type WorkflowSuccessCriterion = WorkflowGoal["successCriteria"][number];

export const workflowGoalCriterionResultSchema = z
  .object({
    criterionId: z.string().min(1).max(100),
    satisfied: z.boolean(),
    evidence: z.string().min(1).max(4_000),
  })
  .strict();

export type WorkflowGoalCriterionResult = z.infer<
  typeof workflowGoalCriterionResultSchema
>;

export const workflowGoalEvaluationSchema = z
  .object({
    satisfied: z.boolean(),
    reason: z.string().min(1).max(2_000),
    criteria: z.array(workflowGoalCriterionResultSchema).min(1).max(8),
  })
  .strict();

export const workflowGoalEvaluationJsonSchema = z.toJSONSchema(
  workflowGoalEvaluationSchema,
);

export type WorkflowGoalEvaluation = z.infer<
  typeof workflowGoalEvaluationSchema
>;

export const workflowGoalValidationSchema = workflowGoalEvaluationSchema
  .extend({ validatedAt: z.iso.datetime() })
  .strict();

export type WorkflowGoalValidation = z.infer<
  typeof workflowGoalValidationSchema
>;

export interface CreateWorkflowDefinitionRequest {
  readonly key: string;
  readonly name: string;
  readonly description?: string;
  readonly activation?: WorkflowActivation;
  readonly goal: WorkflowGoal;
  readonly graph: WorkflowGraph;
}

export interface WorkflowActivation {
  readonly description: string;
  readonly examples: readonly string[];
}

export type WorkflowDefinitionSource = "manual" | "generated";

export interface StartWorkflowRequest {
  readonly input?: Readonly<Record<string, unknown>>;
}
