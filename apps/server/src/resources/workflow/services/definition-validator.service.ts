import { BadRequestException, Injectable } from '@nestjs/common';
import type {
  WorkflowGoal,
  WorkflowGraph,
  WorkflowNode,
} from '@repo/contracts/workflow';
import { workflowGoalSchema } from '@repo/contracts/workflow';
import { AI_ASSISTANT_CAPABILITIES } from '@repo/contracts/assistant';

@Injectable()
export class DefinitionValidator {
  validateGoal(goal: WorkflowGoal): void {
    if (!workflowGoalSchema.safeParse(goal).success) {
      throw new BadRequestException('Workflow goal is invalid');
    }
  }

  validate(graph: WorkflowGraph): void {
    if (!Array.isArray(graph.nodes) || graph.nodes.length === 0) {
      throw new BadRequestException('A workflow requires at least one node');
    }
    if (!Array.isArray(graph.edges)) {
      throw new BadRequestException('Workflow edges must be an array');
    }

    const nodes = new Map<string, WorkflowNode>();
    for (const node of graph.nodes) {
      if (!node.id || nodes.has(node.id)) {
        throw new BadRequestException('Workflow node IDs must be unique');
      }
      if (!['agent', 'condition', 'end'].includes(node.type)) {
        throw new BadRequestException(`Unsupported workflow node: ${node.id}`);
      }
      if (
        node.type === 'agent' &&
        (!AI_ASSISTANT_CAPABILITIES.includes(node.capability) ||
          !node.context ||
          typeof node.context.url !== 'string' ||
          typeof node.context.title !== 'string' ||
          (!node.context.selectedText && !node.context.pageContent))
      ) {
        throw new BadRequestException(`Agent node ${node.id} is invalid`);
      }
      if (
        node.type === 'agent' &&
        ((node.contextSource &&
          !['definition', 'task'].includes(node.contextSource)) ||
          (node.inputSource &&
            !['definition', 'task'].includes(node.inputSource)))
      ) {
        throw new BadRequestException(
          `Agent node ${node.id} has an invalid source`,
        );
      }
      if (
        node.type === 'agent' &&
        node.instruction !== undefined &&
        (typeof node.instruction !== 'string' ||
          node.instruction.length > 2_000)
      ) {
        throw new BadRequestException(
          `Agent node ${node.id} has an invalid instruction`,
        );
      }
      if (
        node.type === 'condition' &&
        (!node.inputKey || !['exists', 'equals'].includes(node.operator))
      ) {
        throw new BadRequestException(`Condition node ${node.id} is invalid`);
      }
      nodes.set(node.id, node);
    }
    if (!nodes.has(graph.startNodeId)) {
      throw new BadRequestException('Workflow start node does not exist');
    }

    for (const edge of graph.edges) {
      if (!nodes.has(edge.from) || !nodes.has(edge.to)) {
        throw new BadRequestException(
          'Every workflow edge must reference nodes',
        );
      }
    }

    for (const node of graph.nodes) {
      const outgoing = graph.edges.filter((edge) => edge.from === node.id);
      if (node.type === 'end' && outgoing.length > 0) {
        throw new BadRequestException('End nodes cannot have outgoing edges');
      }
      if (node.type === 'agent' && outgoing.length !== 1) {
        throw new BadRequestException('Agent nodes require one outgoing edge');
      }
      if (
        node.type === 'condition' &&
        (!outgoing.some((edge) => edge.outcome === 'true') ||
          !outgoing.some((edge) => edge.outcome === 'false') ||
          outgoing.length !== 2)
      ) {
        throw new BadRequestException(
          'Condition nodes require true and false outgoing edges',
        );
      }
    }

    const reachable = this.assertAcyclic(graph);
    if (reachable.size !== graph.nodes.length) {
      throw new BadRequestException('Every workflow node must be reachable');
    }
  }

  private assertAcyclic(graph: WorkflowGraph): Set<string> {
    const visiting = new Set<string>();
    const visited = new Set<string>();
    const visit = (nodeId: string) => {
      if (visiting.has(nodeId)) {
        throw new BadRequestException('Workflow graphs must be acyclic');
      }
      if (visited.has(nodeId)) return;
      visiting.add(nodeId);
      for (const edge of graph.edges.filter((item) => item.from === nodeId)) {
        visit(edge.to);
      }
      visiting.delete(nodeId);
      visited.add(nodeId);
    };
    visit(graph.startNodeId);
    return visited;
  }
}
