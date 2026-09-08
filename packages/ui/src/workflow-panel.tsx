"use client";

import {
  Check,
  Circle,
  CircleStop,
  LoaderCircle,
  X,
} from "lucide-react";
import type {
  WorkflowInstance,
  WorkflowNode,
  WorkflowNodeExecution,
} from "@repo/contracts/workflow";

import { Button } from "./button";
import { RichContent } from "./rich-content";
import { cn } from "./lib/utils";

export interface WorkflowPanelProps {
  readonly cancelling?: boolean;
  readonly className?: string;
  readonly instance: WorkflowInstance;
  readonly onCancel?: () => void;
}

const terminalStatuses = new Set(["completed", "failed", "cancelled"]);

const executionFor = (
  node: WorkflowNode,
  executions: readonly WorkflowNodeExecution[],
) => executions.find((execution) => execution.nodeId === node.id);

const nodeLabel = (node: WorkflowNode) => {
  if (node.type === "agent") return node.instruction || node.input || node.id;
  if (node.type === "condition") return `Check ${node.inputKey}`;
  return "Complete workflow";
};

const outputText = (output: unknown) => {
  if (typeof output === "string") return output;
  return output === undefined ? undefined : JSON.stringify(output, null, 2);
};

export function WorkflowPanel({
  cancelling = false,
  className,
  instance,
  onCancel,
}: WorkflowPanelProps) {
  const nodes = instance.definition?.graph.nodes ?? [];
  const active = !terminalStatuses.has(instance.status);

  return (
    <section
      aria-live="polite"
      className={cn("flex min-h-0 flex-1 flex-col", className)}
    >
      <div className="flex-1 space-y-5 overflow-y-auto p-4">
        <div>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                Workflow
              </p>
              <h2 className="mt-1 text-base font-semibold">
                {instance.definition?.name ?? "Agent workflow"}
              </h2>
            </div>
            <span className="shrink-0 rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-medium capitalize text-neutral-600 dark:bg-neutral-900 dark:text-neutral-300">
              {instance.status}
            </span>
          </div>
          {instance.definition?.description && (
            <p className="mt-2 text-sm leading-6 text-neutral-500 dark:text-neutral-400">
              {instance.definition.description}
            </p>
          )}
          {instance.definition?.goal?.objective && (
            <p className="mt-3 rounded-xl bg-neutral-50 p-3 text-sm leading-6 text-neutral-700 dark:bg-neutral-900 dark:text-neutral-200">
              {instance.definition.goal.objective}
            </p>
          )}
        </div>

        <ol className="space-y-1">
          {nodes.map((node, index) => {
            const execution = executionFor(node, instance.nodeExecutions);
            const status =
              execution?.status ??
              (node.id === instance.currentNodeId && active
                ? "running"
                : "pending");
            const output = outputText(execution?.output);
            return (
              <li className="relative flex gap-3 pb-4" key={node.id}>
                {index < nodes.length - 1 ? (
                  <span className="absolute bottom-0 left-[9px] top-5 w-px bg-neutral-200 dark:bg-neutral-800" />
                ) : null}
                <span className="relative mt-0.5 flex size-5 shrink-0 items-center justify-center">
                  {status === "running" ? (
                    <LoaderCircle className="size-5 animate-spin text-primary" />
                  ) : status === "completed" ? (
                    <span className="flex size-5 items-center justify-center rounded-full bg-primary text-white">
                      <Check className="size-3" />
                    </span>
                  ) : status === "failed" || status === "cancelled" ? (
                    <span className="flex size-5 items-center justify-center rounded-full bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300">
                      <X className="size-3" />
                    </span>
                  ) : (
                    <Circle className="size-4 text-neutral-300 dark:text-neutral-700" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium leading-5">
                    {nodeLabel(node)}
                  </p>
                  <p className="mt-0.5 text-xs capitalize text-neutral-500 dark:text-neutral-400">
                    {status}
                  </p>
                  {output ? (
                    <RichContent className="mt-2 text-sm" content={output} />
                  ) : null}
                </div>
              </li>
            );
          })}
        </ol>

        {instance.goalValidation ? (
          <div className="rounded-xl border border-neutral-200 p-3 dark:border-neutral-800">
            <p className="text-sm font-medium">Goal validation</p>
            <p className="mt-1 text-sm leading-6 text-neutral-500 dark:text-neutral-400">
              {instance.goalValidation.reason}
            </p>
            <ul className="mt-3 space-y-2">
              {instance.goalValidation.criteria.map((criterion) => (
                <li className="flex gap-2 text-xs leading-5" key={criterion.criterionId}>
                  {criterion.satisfied ? (
                    <Check className="mt-0.5 size-3.5 shrink-0 text-green-600" />
                  ) : (
                    <X className="mt-0.5 size-3.5 shrink-0 text-red-600" />
                  )}
                  <span>{criterion.evidence}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {instance.error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm leading-6 text-red-700 dark:border-red-950 dark:bg-red-950/30 dark:text-red-300">
            {instance.error}
          </div>
        ) : null}
      </div>

      {active && onCancel ? (
        <div className="flex justify-end border-t border-neutral-200 p-3 dark:border-neutral-800">
          <Button
            disabled={cancelling}
            onClick={onCancel}
            size="sm"
            variant="ghost"
          >
            {cancelling ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <CircleStop className="size-4" />
            )}
            Cancel workflow
          </Button>
        </div>
      ) : null}
    </section>
  );
}
