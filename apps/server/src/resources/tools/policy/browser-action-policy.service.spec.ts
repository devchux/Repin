import type {
  BrowserToolExecutionContext,
  BrowserToolExecutor,
} from '../types/browser-tool.types';
import { BrowserActionPolicyService } from './browser-action-policy.service';

describe('BrowserActionPolicyService', () => {
  const context = {
    userId: 1,
    runId: 'run-1',
    browserSessionId: 'session-1',
  } as BrowserToolExecutionContext;
  const executor = {
    getElement: jest.fn(),
  } as unknown as BrowserToolExecutor;
  const policy = new BrowserActionPolicyService();

  beforeEach(() => jest.clearAllMocks());

  it('requires approval for a consequential ordinary click', async () => {
    jest.spyOn(executor, 'getElement').mockResolvedValue({
      ref: 'e1',
      tabId: 'tab-1',
      documentRevision: 'revision-1',
      role: 'button',
      name: 'Delete account',
      visible: true,
      editable: false,
      attributes: {},
      actions: ['click'],
    });

    await expect(
      policy.evaluate(
        {
          name: 'browser_click',
          arguments: { ref: 'e1', documentRevision: 'revision-1' },
        },
        context,
        executor,
      ),
    ).resolves.toMatchObject({
      requiresApproval: true,
      effect: 'destructive',
    });
  });

  it('redacts sensitive text from approval display arguments', async () => {
    jest.spyOn(executor, 'getElement').mockResolvedValue({
      ref: 'e1',
      tabId: 'tab-1',
      documentRevision: 'revision-1',
      role: 'textbox',
      visible: true,
      editable: true,
      attributes: { type: 'password' },
      actions: ['fill'],
    });

    await expect(
      policy.evaluate(
        {
          name: 'browser_fill',
          arguments: {
            ref: 'e1',
            documentRevision: 'revision-1',
            text: 'secret',
          },
        },
        context,
        executor,
      ),
    ).resolves.toMatchObject({
      requiresApproval: true,
      effect: 'sensitive_input',
      displayArguments: { text: '[REDACTED]' },
    });
  });
});
