import { Injectable } from '@nestjs/common';
import type {
  BrowserToolCall,
  BrowserToolExecutionContext,
  BrowserToolExecutor,
} from '../types/browser-tool.types';
import { getBrowserToolDescriptor } from './browser-tool-descriptors';

export interface BrowserActionPolicyDecision {
  readonly requiresApproval: boolean;
  readonly effect: string;
  readonly reason: string;
  readonly displayArguments: Readonly<Record<string, unknown>>;
}

const CONSEQUENTIAL_PATTERNS = [
  ['financial', /buy|purchase|pay|checkout|place order|transfer|subscribe/i],
  ['communication', /send|publish|post|reply|share|submit comment/i],
  ['destructive', /delete|remove|erase|close account|cancel account/i],
  ['authentication', /sign in|log in|authorize|connect account/i],
] as const;

@Injectable()
export class BrowserActionPolicyService {
  async evaluate(
    call: BrowserToolCall,
    context: BrowserToolExecutionContext,
    executor: BrowserToolExecutor,
  ): Promise<BrowserActionPolicyDecision> {
    const descriptor = getBrowserToolDescriptor(call.name);
    const base = {
      requiresApproval: descriptor.requiresApproval,
      effect: descriptor.sideEffect,
      reason: descriptor.requiresApproval
        ? `${call.name} is a consequential browser capability`
        : `${call.name} is allowed by static tool policy`,
      displayArguments: call.arguments,
    };
    const ref = call.arguments.ref;
    const documentRevision = call.arguments.documentRevision;
    if (
      typeof ref !== 'string' ||
      typeof documentRevision !== 'string' ||
      ![
        'browser_click',
        'browser_double_click',
        'browser_fill',
        'browser_type',
      ].includes(call.name)
    ) {
      return base;
    }

    const element = await executor.getElement(context, {
      tabId:
        typeof call.arguments.tabId === 'string'
          ? call.arguments.tabId
          : undefined,
      ref,
      documentRevision,
    });
    const semantics = [
      element.name,
      element.text,
      element.value,
      element.attributes['aria-label'],
      element.attributes['name'],
      element.attributes['type'],
      element.attributes['autocomplete'],
    ]
      .filter(Boolean)
      .join(' ');
    const sensitiveInput =
      (call.name === 'browser_fill' || call.name === 'browser_type') &&
      /password|credit.?card|card.?number|cvv|cvc|social.?security|ssn/i.test(
        semantics,
      );
    const matched = CONSEQUENTIAL_PATTERNS.find(([, pattern]) =>
      pattern.test(semantics),
    );
    if (!sensitiveInput && !matched) return base;

    return {
      requiresApproval: true,
      effect: sensitiveInput ? 'sensitive_input' : matched![0],
      reason: sensitiveInput
        ? 'The target appears to accept credentials or sensitive financial data'
        : `The target appears to cause a ${matched![0]} action`,
      displayArguments: sensitiveInput
        ? { ...call.arguments, text: '[REDACTED]' }
        : call.arguments,
    };
  }
}
